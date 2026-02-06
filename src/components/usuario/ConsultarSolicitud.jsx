import { useState, useEffect } from 'react';
import '../../styles/ConsultarSolicitud.css';
import logo from '../../assets/logo.png';
import SuccessModal from '../SuccessModal';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

// Constantes
const CONSTANTS = {
    MAX_CARACTERES_COMENTARIO: 30,
    EXTENSIONES_PERMITIDAS: ['.pdf', '.jpg', '.jpeg', '.png'],
    TAMANO_MAXIMO: 5 * 1024 * 1024, // 5 MB
    REGEX_NUMERO_VALIDO: /^\d{7}$/,
    REGEX_SOLO_NUMEROS: /^\d*$/,
};

const ESTADOS = {
    1: 'Nueva',
    2: 'En Revisión',
    3: 'Completada',
    4: 'Rechazada',
    5: 'Pendiente de respuesta',
    6: 'Respuesta de usuario',
};

const ConsultarSolicitud = () => {
    const navigate = useNavigate();

    // Estados principales
    const [numeroSolicitud, setNumeroSolicitud] = useState('');
    const [solicitud, setSolicitud] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Estados para archivos
    const [archivosNuevos, setArchivosNuevos] = useState([]);
    const [enviandoArchivos, setEnviandoArchivos] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Estados para modales
    const [success, setSuccess] = useState('');
    const [comentarioCompleto, setComentarioCompleto] = useState(null);

    // Estados para certificaciones
    const [certificaciones, setCertificaciones] = useState([]);
    const [loadingCertificaciones, setLoadingCertificaciones] = useState(false);

    // Cargar número de solicitud desde URL al montar
    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const numeroParam = params.get('numero');

        if (numeroParam && CONSTANTS.REGEX_NUMERO_VALIDO.test(numeroParam)) {
            setNumeroSolicitud(numeroParam);
            setTimeout(() => {
                buscarSolicitudPorNumero(numeroParam);
            }, 500);
        }
    }, []);

    // ==================== VALIDACIONES Y CONVERSIONES DE ESTADO ====================

    const esNumeroValido = CONSTANTS.REGEX_NUMERO_VALIDO.test(numeroSolicitud);

    /**
     * Obtiene el estado como número, con mejor manejo de diferentes formatos
     * Maneja: number, string numérico, string con espacios
     */
    const obtenerEstadoNumerico = (estado) => {
        // Si ya es número, retorna directamente
        if (typeof estado === 'number') {
            return estado;
        }

        // Si es string, limpia espacios y convierte
        if (typeof estado === 'string') {
            const estadoLimpio = estado.trim();
            const numeroEstado = parseInt(estadoLimpio, 10);

            // Validar que sea un número válido
            if (!isNaN(numeroEstado) && numeroEstado > 0) {
                return numeroEstado;
            }
        }

        // Si no se puede convertir, retorna null
        return null;
    };

    const obtenerNombreEstado = (estadoNumerico) => {
        return ESTADOS[estadoNumerico] || 'Desconocido';
    };

    const estadoMostrar = () => {
        if (!solicitud) return '';

        const estadoNum = obtenerEstadoNumerico(solicitud.estado);
        if (estadoNum) {
            return obtenerNombreEstado(estadoNum);
        }

        return solicitud.estado || 'Pendiente';
    };

    /**
     * Estado 5: Permite subir archivos para correcciones
     */
    const puedeSubirArchivos = () => {
        if (!solicitud) return false;
        const estadoNum = obtenerEstadoNumerico(solicitud.estado);
        return estadoNum === 5;
    };

    /**
     * Estado 1, 5, 6: Muestra documentos de la solicitud
     */
    const puedeVerArchivos = () => {
        if (!solicitud) return false;
        const estadoNum = obtenerEstadoNumerico(solicitud.estado);
        return [1, 5, 6].includes(estadoNum);
    };

    /**
     * Estado 3: Muestra certificado
     */
    const puedeMostrarCertificado = () => {
        if (!solicitud) return false;
        const estadoNum = obtenerEstadoNumerico(solicitud.estado);
        const resultado = estadoNum === 3;

        // Debug: descomentar para ver qué está pasando
        console.log('puedeMostrarCertificado:', {
            estadoOriginal: solicitud.estado,
            estadoNumerico: estadoNum,
            esIgualA3: resultado
        });

        return resultado;
    };

    const validarArchivo = (file) => {
        const extension = '.' + file.name.split('.').pop().toLowerCase();

        if (!CONSTANTS.EXTENSIONES_PERMITIDAS.includes(extension)) {
            return `Formato no permitido. Solo se aceptan: ${CONSTANTS.EXTENSIONES_PERMITIDAS.join(', ')}`;
        }

        if (file.size > CONSTANTS.TAMANO_MAXIMO) {
            return 'El archivo no debe superar los 5 MB.';
        }

        return null;
    };

    // ==================== BÚSQUEDA DE SOLICITUD ====================

    const buscarSolicitud = async () => {
        if (!esNumeroValido) return;
        await buscarSolicitudPorNumero(numeroSolicitud);
    };

    const buscarSolicitudPorNumero = async (numero) => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/Solicitudes/${numero}`);

            if (!response.ok) {
                throw new Error('Número de solicitud incorrecto, favor verificar.');
            }

            const data = await response.json();

            // Debug: ver qué datos recibimos
            console.log('Solicitud recibida:', {
                numero: data.numeroSolicitud,
                estado: data.estado,
                tipoEstado: typeof data.estado
            });

            setSolicitud(data);

            // Si el estado es 3 (Completada), cargar certificaciones
            const estadoNum = obtenerEstadoNumerico(data.estado);
            if (estadoNum === 3) {
                console.log('Cargando certificaciones para solicitud:', numero);
                cargarCertificaciones(numero);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Carga las certificaciones de una solicitud completada
     */
    const cargarCertificaciones = async (numeroSolicitud) => {
        setLoadingCertificaciones(true);
        setCertificaciones([]); // Limpiar certificaciones previas

        try {
            console.log('Llamando a:', `${API_URL}/api/Solicitudes/${numeroSolicitud}/certificaciones`);

            const response = await fetch(
                `${API_URL}/api/Solicitudes/${numeroSolicitud}/certificaciones`
            );

            if (response.ok) {
                const data = await response.json();
                console.log('Certificaciones recibidas:', data);
                setCertificaciones(data || []);
            } else {
                console.log('Error en respuesta de certificaciones:', response.status);
                setCertificaciones([]);
            }
        } catch (error) {
            console.error('Error cargando certificaciones:', error);
            setCertificaciones([]);
        } finally {
            setLoadingCertificaciones(false);
        }
    };

    // ==================== MANEJADORES DE INPUT ====================

    const handleNumeroChange = (e) => {
        const value = e.target.value;

        if (!CONSTANTS.REGEX_SOLO_NUMEROS.test(value)) {
            setError('Este campo solo acepta valores numéricos.');
            return;
        }

        setError('');
        setNumeroSolicitud(value);
        setSolicitud(null);
        setCertificaciones([]);
        setArchivosNuevos([]);
    };

    // ==================== MANEJO DE ARCHIVOS ====================

    const procesarArchivos = (files) => {
        if (files.length === 0) return;

        const nuevosArchivos = [];
        const errores = [];

        for (const file of files) {
            const errorValidacion = validarArchivo(file);
            if (errorValidacion) {
                errores.push(`${file.name}: ${errorValidacion}`);
            } else {
                nuevosArchivos.push(file);
            }
        }

        if (errores.length > 0) {
            setError(errores.join('\n'));
            return;
        }

        setError('');
        setArchivosNuevos([...archivosNuevos, ...nuevosArchivos]);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        procesarArchivos(files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        procesarArchivos(files);
    };

    const eliminarArchivo = (index) => {
        setArchivosNuevos(archivosNuevos.filter((_, i) => i !== index));
    };

    const enviarArchivosActualizados = async () => {
        if (archivosNuevos.length === 0) {
            setError('Debes cargar al menos un documento.');
            return;
        }

        setEnviandoArchivos(true);
        setError('');
        setSuccess('');

        try {
            const formData = new FormData();
            archivosNuevos.forEach((archivo) => formData.append('Archivos', archivo));

            const response = await fetch(
                `${API_URL}/api/Solicitudes/${numeroSolicitud}/archivos`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            if (response.ok) {
                setArchivosNuevos([]);
                await buscarSolicitudPorNumero(numeroSolicitud);
                setSuccess(
                    'Documentos enviados exitosamente. Su solicitud ha sido actualizada.'
                );
            } else {
                const errorData = await response.text();
                setError(`Error al actualizar archivos: ${errorData}`);
            }
        } catch (error) {
            console.error(error);
            setError('Hubo un problema de comunicación con el servidor.');
        } finally {
            setEnviandoArchivos(false);
        }
    };

    // ==================== RENDER COMPONENTES ====================

    const renderSeccionActualizarDocumentos = () => {
        if (!puedeSubirArchivos()) return null;

        return (
            <div className="section-consulta">
                <div className="section-title">Actualizar documentos</div>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                    Su solicitud requiere correcciones. Por favor, cargue los documentos
                    actualizados.
                </p>

                <div
                    className={`upload-box-consulta ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() =>
                        !enviandoArchivos &&
                        document.getElementById('file-upload-consulta').click()
                    }
                >
                    <input
                        type="file"
                        id="file-upload-consulta"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={enviandoArchivos}
                        multiple
                        style={{ display: 'none' }}
                    />
                    <svg
                        className="upload-icon-consulta"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                    <p>
                        {archivosNuevos.length > 0
                            ? `${archivosNuevos.length} archivo(s) seleccionado(s)`
                            : 'Arrastra o selecciona documentos'}
                    </p>
                    <small>
                        Formatos permitidos: PDF, JPG, JPEG, PNG (máx. 5MB cada uno)
                    </small>
                </div>

                {archivosNuevos.length > 0 && (
                    <>
                        <div className="archivos-nuevos-list">
                            {archivosNuevos.map((archivo, index) => (
                                <div key={index} className="archivo-nuevo-item">
                                    <span>{archivo.name}</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            eliminarArchivo(index);
                                        }}
                                        className="btn-eliminar-archivo"
                                        disabled={enviandoArchivos}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            className="btn-enviar-archivos"
                            onClick={enviarArchivosActualizados}
                            disabled={enviandoArchivos}
                        >
                            {enviandoArchivos ? 'Enviando...' : 'Enviar documentos'}
                        </button>
                    </>
                )}
            </div>
        );
    };

    const renderSeccionDocumentos = () => {
        if (!puedeVerArchivos() || !solicitud?.archivosActuales?.length) {
            return null;
        }

        return (
            <div className="section-consulta">
                <div className="section-title">Documentos de la solicitud</div>
                <div className="document-list">
                    {solicitud.archivosActuales.map((archivo) => (
                        <div key={archivo.id} className="document-item">
                            <span className="document-name">{archivo.nombreOriginal}</span>
                            <a
                                href={`${API_URL}/api/Solicitudes/archivo/${archivo.id}/ver`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="document-view"
                            >
                                <i className="bi bi-eye"></i>
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderSeccionCertificado = () => {
        // Primero verificar si puede mostrar certificado
        if (!puedeMostrarCertificado()) {
            return null;
        }

        // Mientras carga
        if (loadingCertificaciones) {
            return (
                <div className="section-consulta">
                    <div className="section-title">Certificado</div>
                    <p style={{ textAlign: 'center', color: '#666' }}>
                        Cargando certificado...
                    </p>
                </div>
            );
        }

        // Si no hay certificaciones
        if (!certificaciones || certificaciones.length === 0) {
            return (
                <div className="section-consulta">
                    <div className="section-title">Certificado</div>
                    <p style={{ textAlign: 'center', color: '#999' }}>
                        No hay certificado disponible
                    </p>
                </div>
            );
        }

        // Obtener solo el último certificado (el más reciente)
        const ultimoCertificado = certificaciones[certificaciones.length - 1];

        // Si hay certificaciones, mostrar solo la más reciente
        return (
            <div className="section-consulta">
                <div className="section-title">Certificado</div>
                <div className="document-list">
                    <div key={ultimoCertificado.id} className="document-item">
                        <span className="document-name">
                            {ultimoCertificado?.nombreArchivo || 'Certificado de título'}
                        </span>
                        <a
                            href={`${API_URL}/api/Solicitudes/certificacion/${ultimoCertificado.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="document-view"
                        >
                            <i className="bi bi-eye"></i>
                        </a>
                    </div>
                </div>
            </div>
        );
    };

    const renderHistorial = () => {
        if (!solicitud?.historial?.length) return null;

        const formatearFecha = (fecha) => {
            return new Date(fecha).toLocaleDateString('es-DO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        };

        const esComentarioLargo = (comentario) => {
            return comentario.length > CONSTANTS.MAX_CARACTERES_COMENTARIO;
        };

        return (
            <div className="form-group">
                <div className="section-title">Historial de correcciones</div>

                <div className="historial-tabla">
                    <div className="historial-header-row">
                        <div className="historial-col-fecha">Fecha devolución</div>
                        <div className="historial-col-comentario">Comentario</div>
                    </div>

                    {solicitud.historial.map((item, index) => (
                        <div key={index} className="historial-body-row">
                            <div className="historial-col-fecha-content">
                                {item.fechaDevolucion
                                    ? formatearFecha(item.fechaDevolucion)
                                    : 'Sin fecha'}
                            </div>

                            <div className="historial-col-comentario-content">
                                {item.comentario && (
                                    <div
                                        className={`historial-texto-wrapper ${esComentarioLargo(item.comentario)
                                                ? 'clickeable'
                                                : ''
                                            }`}
                                        onClick={() => {
                                            if (esComentarioLargo(item.comentario)) {
                                                setComentarioCompleto(item);
                                            }
                                        }}
                                        title={
                                            esComentarioLargo(item.comentario)
                                                ? 'Ver comentario completo'
                                                : ''
                                        }
                                    >
                                        <div className="historial-texto">
                                            {esComentarioLargo(item.comentario)
                                                ? `${item.comentario.substring(
                                                    0,
                                                    CONSTANTS.MAX_CARACTERES_COMENTARIO
                                                )}...`
                                                : item.comentario}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderModalComentario = () => {
        if (!comentarioCompleto) return null;

        const formatearFechaLarga = (fecha) => {
            return new Date(fecha).toLocaleDateString('es-DO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        };

        return (
            <div
                className="modal-overlay"
                onClick={() => setComentarioCompleto(null)}
            >
                <div
                    className="modal modal-comentario"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <h3>Comentario completo</h3>
                        <button
                            className="modal-close-btn"
                            onClick={() => setComentarioCompleto(null)}
                            title="Cerrar"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="modal-body">
                        <div className="comentario-fecha">
                            <strong>Fecha de devolución:</strong>{' '}
                            {comentarioCompleto.fechaDevolucion
                                ? formatearFechaLarga(
                                    comentarioCompleto.fechaDevolucion
                                )
                                : 'Sin fecha'}
                        </div>

                        <div className="comentario-texto-completo">
                            {comentarioCompleto.comentario}
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button
                            className="btn-primary"
                            onClick={() => setComentarioCompleto(null)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ==================== RENDER PRINCIPAL ====================

    return (
        <div>
            <div className="modal-overlay-s">
                <div className="consulta-container">
                    <div className="consulta-header">
                        <img
                            src={logo}
                            alt="Registro Inmobiliario"
                            className="consulta-logo"
                        />
                    </div>

                    <h2 className="consulta-title">Verificar estatus de solicitud</h2>

                    {/* Formulario de búsqueda */}
                    <div className="form-group-consulta">
                        <label>Número de solicitud</label>
                        <div className="input-with-button">
                            <input
                                type="text"
                                maxLength={7}
                                value={numeroSolicitud}
                                onChange={handleNumeroChange}
                                className="form-control input-consulta"
                                disabled={loading}
                                placeholder="0000000"
                            />

                            <button
                                type="button"
                                className="btn-search"
                                onClick={buscarSolicitud}
                                disabled={!esNumeroValido || loading}
                            >
                                {loading ? (
                                    <i className="bi bi-arrow-repeat spin"></i>
                                ) : (
                                    <i className="bi bi-search"></i>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mensaje de error */}
                    {error && <div className="error-message-consulta">{error}</div>}

                    {/* Información de la solicitud */}
                    <div className="form-group-consulta">
                        <label>Nombre completo</label>
                        <input
                            readOnly
                            className="input-consulta"
                            value={solicitud?.nombre || ''}
                        />
                    </div>

                    <div className="form-group-consulta">
                        <label>Correo electrónico</label>
                        <input
                            readOnly
                            className="input-consulta"
                            value={solicitud?.correo || ''}
                        />
                    </div>

                    <div className="form-group-consulta">
                        <label>Estado</label>
                        <input
                            readOnly
                            className="input-consulta"
                            value={estadoMostrar()}
                        />
                    </div>

                    {/* Secciones condicionales */}
                    {renderSeccionActualizarDocumentos()}
                    {renderSeccionDocumentos()}
                    {renderSeccionCertificado()}
                    {renderHistorial()}

                    {/* Botón aceptar */}
                    <button className="btn-aceptar" onClick={() => navigate('/')}>
                        Aceptar
                    </button>
                </div>
            </div>

            {/* Modal de éxito */}
            <SuccessModal
                message={success}
                onClose={() => {
                    setSuccess('');
                    navigate('/');
                }}
            />

            {/* Modal de comentario completo */}
            {renderModalComentario()}
        </div>
    );
};

export default ConsultarSolicitud;