import React, { useEffect, useState, useCallback } from 'react';
import '../../styles/ResponderSolicitudes.css';
import SuccessModal from '../SuccessModal';
import { useParams, useNavigate, useLocation } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

// ==================== CONSTANTES ====================

const CONSTANTS = {
    COMENTARIO_MIN: 10,
    COMENTARIO_MAX: 250,
    TAMANO_MAXIMO: 5 * 1024 * 1024, // 5MB
    EXTENSIONES_PERMITIDAS: ['.pdf', '.jpg', '.jpeg', '.png'],
    MAX_CARACTERES_COMENTARIO: 50, // Para mostrar en tabla
};

const TIPOS_RESPUESTA = {
    CORRECCIONES: 'correcciones',
    CERTIFICACION: 'certificacion',
};

// ==================== COMPONENTE PRINCIPAL ====================

const RespuestaSolicitud = () => {
    const { numeroSolicitud } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // ==================== ESTADO ====================

    const [solicitud, setSolicitud] = useState(null);
    const [respuesta, setRespuesta] = useState('');
    const [comentario, setComentario] = useState('');
    const [archivos, setArchivos] = useState([]);
    const [archivosSeleccionados, setArchivosSeleccionados] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [errores, setErrores] = useState({});
    const [comentarioCompleto, setComentarioCompleto] = useState(null);

    const from = location.state?.from;
    const redirectPath = from === "admin"
        ? "/admin/solicitudes"
        : "/empleado/gestor-solicitudes";

    // ==================== FUNCIONES DE UTILIDAD ====================

    const validarArchivo = useCallback((file) => {
        const extension = "." + file.name.split(".").pop().toLowerCase();

        if (!CONSTANTS.EXTENSIONES_PERMITIDAS.includes(extension)) {
            return `Formato no permitido. Solo se aceptan: ${CONSTANTS.EXTENSIONES_PERMITIDAS.join(", ")}`;
        }

        if (file.size > CONSTANTS.TAMANO_MAXIMO) {
            return "El archivo no debe superar los 5 MB.";
        }

        return null;
    }, []);

    const procesarArchivos = useCallback((files) => {
        if (files.length === 0) return;

        const nuevosArchivos = [];
        const erroresValidacion = [];

        for (const file of files) {
            const errorValidacion = validarArchivo(file);
            if (errorValidacion) {
                erroresValidacion.push(`${file.name}: ${errorValidacion}`);
            } else {
                nuevosArchivos.push(file);
            }
        }

        if (erroresValidacion.length > 0) {
            setError(erroresValidacion.join("\n"));
            return;
        }

        setError("");
        setArchivosSeleccionados(prev => [...prev, ...nuevosArchivos]);
    }, [validarArchivo]);

    // ==================== FUNCIONES DE API ====================

    const fetchSolicitud = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/Solicitudes/${numeroSolicitud}`);
            if (!response.ok) throw new Error("No se encontró la solicitud");
            const data = await response.json();
            setSolicitud(data);
            setArchivos(data.archivosActuales || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [numeroSolicitud]);

    // ==================== EFECTOS ====================

    useEffect(() => {
        fetchSolicitud();
    }, [fetchSolicitud]);

    // ==================== MANEJADORES DE EVENTOS ====================

    const handleFileChange = useCallback((e) => {
        const files = Array.from(e.target.files);
        procesarArchivos(files);
    }, [procesarArchivos]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        procesarArchivos(files);
    }, [procesarArchivos]);

    const eliminarArchivo = useCallback((index) => {
        setArchivosSeleccionados(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleComentarioChange = useCallback((e) => {
        const valor = e.target.value;
        setComentario(valor);

        if (respuesta === TIPOS_RESPUESTA.CORRECCIONES) {
            if (valor.length < CONSTANTS.COMENTARIO_MIN) {
                setErrores(prev => ({
                    ...prev,
                    comentario: `El comentario debe tener al menos ${CONSTANTS.COMENTARIO_MIN} caracteres`
                }));
            } else if (valor.length > CONSTANTS.COMENTARIO_MAX) {
                setErrores(prev => ({
                    ...prev,
                    comentario: `El comentario no puede exceder ${CONSTANTS.COMENTARIO_MAX} caracteres`
                }));
            } else {
                setErrores(prev => ({ ...prev, comentario: null }));
            }
        }
    }, [respuesta]);

    const handleRespuestaChange = useCallback((e) => {
        const valor = e.target.value;
        setRespuesta(valor);
        setComentario('');
        setArchivosSeleccionados([]);
        setErrores({});
        setError('');
    }, []);

    // ==================== FUNCIONES DE VALIDACIÓN ====================

    const formularioValido = useCallback(() => {
        if (!respuesta) return false;

        if (respuesta === TIPOS_RESPUESTA.CORRECCIONES) {
            return (
                comentario.length >= CONSTANTS.COMENTARIO_MIN &&
                comentario.length <= CONSTANTS.COMENTARIO_MAX &&
                !errores.comentario
            );
        }

        if (respuesta === TIPOS_RESPUESTA.CERTIFICACION) {
            return archivosSeleccionados.length > 0;
        }

        return false;
    }, [respuesta, comentario, errores, archivosSeleccionados]);

    // ==================== FUNCIONES DE ENVÍO ====================

    const handleEnviarRespuesta = useCallback(async () => {
        if (!formularioValido()) {
            setError('Por favor complete todos los campos obligatorios correctamente');
            return;
        }

        try {
            setEnviando(true);
            setError('');

            if (respuesta === TIPOS_RESPUESTA.CORRECCIONES) {
                const res = await fetch(
                    `${API_URL}/api/Solicitudes/${solicitud.id}/devolver`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(comentario),
                    }
                );

                if (!res.ok) throw new Error('Error al enviar correcciones');
                setSuccess('La solicitud fue devuelta correctamente para correcciones.');
            }

            if (respuesta === TIPOS_RESPUESTA.CERTIFICACION) {
                const formData = new FormData();
                archivosSeleccionados.forEach(archivo => {
                    formData.append('archivos', archivo);
                });

                const res = await fetch(
                    `${API_URL}/api/Solicitudes/${numeroSolicitud}/responder`,
                    {
                        method: 'POST',
                        body: formData,
                    }
                );

                if (!res.ok) throw new Error('Error al enviar certificación');
                setSuccess('La certificación fue enviada correctamente.');
            }
        } catch (err) {
            console.error(err);
            setError('Ocurrió un error al enviar la respuesta.');
        } finally {
            setEnviando(false);
        }
    }, [respuesta, formularioValido, solicitud?.id, numeroSolicitud, archivosSeleccionados, comentario]);

    // ==================== RENDER - DOCUMENTOS ====================

    const renderDocumentos = () => {
        if (archivos.length === 0) {
            return <p>No hay archivos cargados.</p>;
        }

        return (
            <div className="archivos-table">
                <div className="archivos-header">
                    <div className="header-col">Documento</div>
                    <div className="header-col-accion">Acción</div>
                </div>
                <div className="archivos-body">
                    {archivos.map((archivo) => (
                        <div key={archivo.id} className="archivo-row">
                            <div className="archivo-nombre-col">{archivo.nombreOriginal}</div>
                            <div className="archivo-accion-col">
                                <a
                                    href={`${API_URL}/api/Solicitudes/archivo/${archivo.id}/ver`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Ver archivo"
                                    className="icon-link"
                                >
                                    <i className="bi bi-eye"></i>
                                </a>
                                <a
                                    href={`${API_URL}/api/Solicitudes/archivo/${archivo.id}`}
                                    download={archivo.nombreOriginal}
                                    title="Descargar archivo"
                                    className="icon-link"
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ==================== RENDER - HISTORIAL ====================

    const renderHistorial = () => {
        if (!solicitud?.historial || solicitud.historial.length === 0) {
            return null;
        }

        return (
            <div className="form-group">
                <label>Historial</label>
                <div className="historial-tabla">
                    <div className="historial-header-row">
                        <div className="historial-col-fecha">Fecha devolución</div>
                        <div className="historial-col-comentario">Comentario</div>
                    </div>

                    {solicitud.historial.map((item, index) => (
                        <div key={index} className="historial-body-row">
                            <div className="historial-col-fecha-content">
                                {item.fechaDevolucion ? (
                                    new Date(item.fechaDevolucion).toLocaleDateString('es-DO', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit'
                                    })
                                ) : (
                                    'Sin fecha'
                                )}
                            </div>

                            <div className="historial-col-comentario-content">
                                {item.comentario && (
                                    <div
                                        className={`historial-texto-wrapper ${item.comentario.length > CONSTANTS.MAX_CARACTERES_COMENTARIO
                                            ? "clickeable"
                                            : ""
                                            }`}
                                        onClick={() => {
                                            if (item.comentario.length > CONSTANTS.MAX_CARACTERES_COMENTARIO) {
                                                setComentarioCompleto(item);
                                            }
                                        }}
                                        title={
                                            item.comentario.length > CONSTANTS.MAX_CARACTERES_COMENTARIO
                                                ? "Ver comentario completo"
                                                : ""
                                        }
                                    >
                                        <div className="historial-texto">
                                            {item.comentario.length > CONSTANTS.MAX_CARACTERES_COMENTARIO
                                                ? `${item.comentario.substring(0, CONSTANTS.MAX_CARACTERES_COMENTARIO)}...`
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

    // ==================== RENDER - SECCIÓN COMENTARIOS ====================

    const renderSeccionComentarios = () => {
        if (respuesta !== TIPOS_RESPUESTA.CORRECCIONES) {
            return null;
        }

        return (
            <div className="form-group">
                <label>
                    Comentarios <span className="required">*</span>
                </label>
                <textarea
                    value={comentario}
                    onChange={handleComentarioChange}
                    placeholder={`Ingrese un comentario (mínimo ${CONSTANTS.COMENTARIO_MIN}, máximo ${CONSTANTS.COMENTARIO_MAX} caracteres)`}
                    maxLength={CONSTANTS.COMENTARIO_MAX}
                    disabled={enviando}
                    rows={5}
                />
                <div className="caracteres-contador">
                    {comentario.length}/{CONSTANTS.COMENTARIO_MAX} caracteres
                </div>
                {errores.comentario && (
                    <div className="error-message">{errores.comentario}</div>
                )}
            </div>
        );
    };

    // ==================== RENDER - SECCIÓN ARCHIVOS ====================

    const renderSeccionArchivos = () => {
        if (respuesta !== TIPOS_RESPUESTA.CERTIFICACION) {
            return null;
        }

        return (
            <div className="form-group">
                <label>
                    Cargar documentos <span className="required">*</span>
                </label>
                <div
                    className={`upload-box ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !enviando && document.getElementById('file-upload').click()}
                >
                    <input
                        type="file"
                        id="file-upload"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={enviando}
                        multiple
                        style={{ display: 'none' }}
                    />
                    <svg
                        className="upload-icon"
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
                    <p>{archivosSeleccionados.length > 0
                        ? `${archivosSeleccionados.length} archivo(s) seleccionado(s)`
                        : "Arrastra o selecciona documentos"}
                    </p>
                    <small>Formatos permitidos: PDF, JPG, JPEG, PNG (máx. 5MB cada uno)</small>
                </div>

                {error && (
                    <div className="error-message-archivos">
                        {error}
                    </div>
                )}

                {archivosSeleccionados.length > 0 && (
                    <div className="archivos-seleccionados-list">
                        {archivosSeleccionados.map((archivo, index) => (
                            <div key={index} className="archivo-seleccionado-item">
                                <span className="archivo-seleccionado-nombre">{archivo.name}</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        eliminarArchivo(index);
                                    }}
                                    className="btn-eliminar-archivo"
                                    disabled={enviando}
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ==================== RENDER - MODAL COMENTARIO ====================

    const renderModalComentario = () => {
        if (!comentarioCompleto) return null;

        return (
            <div className="modal-overlay" onClick={() => setComentarioCompleto(null)}>
                <div className="modal modal-comentario" onClick={(e) => e.stopPropagation()}>
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
                                ? new Date(comentarioCompleto.fechaDevolucion).toLocaleDateString('es-DO', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })
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

    if (loading) return <p>Cargando solicitud...</p>;
    if (error && !archivosSeleccionados.length) return <p>Error: {error}</p>;

    return (
        <div className="page-container">
            <div className="respuesta-solicitud-container">
                <h2>
                    {solicitud.estado === 6
                        ? 'Respuesta solicitud en proceso'
                        : 'Respuesta nueva solicitud'}
                </h2>

                {/* Datos del solicitante */}
                <div className="form-group">
                    <label>Número de cédula</label>
                    <input
                        type="text"
                        value={solicitud.cedula || ''}
                        disabled
                        readOnly
                    />
                </div>

                <div className="form-group">
                    <label>Nombre completo</label>
                    <input
                        type="text"
                        value={solicitud.nombre || ''}
                        disabled
                        readOnly
                    />
                </div>

                {/* Documentos */}
                <div className="form-group">
                    <label>Documentos de la solicitud</label>
                    {renderDocumentos()}
                </div>

                {/* Historial */}
                {renderHistorial()}

                {/* Tipo de respuesta */}
                <div className="form-group">
                    <label>Respuesta a solicitud</label>
                    <select
                        value={respuesta}
                        onChange={handleRespuestaChange}
                        disabled={enviando}
                    >
                        <option value="">Seleccione</option>
                        <option value={TIPOS_RESPUESTA.CORRECCIONES}>
                            Realizar correcciones
                        </option>
                        <option value={TIPOS_RESPUESTA.CERTIFICACION}>
                            Enviar certificación
                        </option>
                    </select>
                </div>

                {/* Secciones condicionales */}
                {renderSeccionComentarios()}
                {renderSeccionArchivos()}

                {/* Acciones */}
                <div className="botones-respuesta">
                    <button
                        onClick={() => navigate(-1)}
                        className="btn-secondary"
                        disabled={enviando}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleEnviarRespuesta}
                        className="btn-primary"
                        disabled={enviando || !formularioValido()}
                    >
                        {enviando ? 'Enviando...' : 'Enviar'}
                    </button>
                </div>

                {/* Modales */}
                <SuccessModal
                    message={success}
                    onClose={() => {
                        setSuccess("");
                        navigate(redirectPath);
                    }}
                />

                {renderModalComentario()}
            </div>
        </div>
    );
};

export default RespuestaSolicitud;