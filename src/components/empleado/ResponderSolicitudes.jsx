import React, { useEffect, useState } from 'react';
import '../../styles/ResponderSolicitudes.css';
import SuccessModal from '../SuccessModal';
import { useParams, useNavigate, useLocation } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const RespuestaSolicitud = () => {
    const { numeroSolicitud } = useParams();
    const navigate = useNavigate();

    /* ===============================
       ESTADO
    =============================== */
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

    // NUEVO: Estado para el modal de comentario
    const [comentarioCompleto, setComentarioCompleto] = useState(null);

    // Determinar la ubicacion para el modal
    const location = useLocation();
    const from = location.state?.from;
    const redirectPath =
        from === "admin"
            ? "/admin/solicitudes"
            : "/empleado/gestor-solicitudes";

    // Configuración de validaciones
    const COMENTARIO_MIN = 10;
    const COMENTARIO_MAX = 250;
    const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB
    const EXTENSIONES_PERMITIDAS = ['.pdf', '.jpg', '.jpeg', '.png'];
    const MAX_CARACTERES_COMENTARIO = 50; // Para mostrar en tabla

    /* ===============================
       CARGA DE SOLICITUD
    =============================== */
    useEffect(() => {
        const fetchSolicitud = async () => {
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
        };
        fetchSolicitud();
    }, [numeroSolicitud]);

    /* ===============================
       VALIDACIÓN DE ARCHIVOS
    =============================== */
    const validarArchivo = (file) => {
        const extension = "." + file.name.split(".").pop().toLowerCase();

        if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
            return `Formato no permitido. Solo se aceptan: ${EXTENSIONES_PERMITIDAS.join(", ")}`;
        }

        if (file.size > TAMANO_MAXIMO) {
            return "El archivo no debe superar los 5 MB.";
        }

        return null;
    };

    /* ===============================
       MANEJO DE ARCHIVOS
    =============================== */
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const nuevosArchivos = [];
        let erroresValidacion = [];

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
        setArchivosSeleccionados([...archivosSeleccionados, ...nuevosArchivos]);
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
        if (files.length === 0) return;

        const nuevosArchivos = [];
        let erroresValidacion = [];

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
        setArchivosSeleccionados([...archivosSeleccionados, ...nuevosArchivos]);
    };

    const eliminarArchivo = (index) => {
        setArchivosSeleccionados(archivosSeleccionados.filter((_, i) => i !== index));
    };

    /* ===============================
       VALIDACIÓN DE COMENTARIO
    =============================== */
    const handleComentarioChange = (e) => {
        const valor = e.target.value;
        setComentario(valor);

        if (respuesta === 'correcciones') {
            if (valor.length < COMENTARIO_MIN) {
                setErrores({
                    ...errores,
                    comentario: `El comentario debe tener al menos ${COMENTARIO_MIN} caracteres`
                });
            } else if (valor.length > COMENTARIO_MAX) {
                setErrores({
                    ...errores,
                    comentario: `El comentario no puede exceder ${COMENTARIO_MAX} caracteres`
                });
            } else {
                setErrores({ ...errores, comentario: null });
            }
        }
    };

    /* ===============================
       CAMBIO DE TIPO DE RESPUESTA
    =============================== */
    const handleRespuestaChange = (e) => {
        const valor = e.target.value;
        setRespuesta(valor);
        setComentario('');
        setArchivosSeleccionados([]);
        setErrores({});
        setError('');
    };

    /* ===============================
       VALIDACIÓN DE FORMULARIO
    =============================== */
    const formularioValido = () => {
        if (!respuesta) return false;

        if (respuesta === 'correcciones') {
            return (
                comentario.length >= COMENTARIO_MIN &&
                comentario.length <= COMENTARIO_MAX &&
                !errores.comentario
            );
        }

        if (respuesta === 'certificacion') {
            return archivosSeleccionados.length > 0;
        }

        return false;
    };

    /* ===============================
       ENVÍO DE RESPUESTA
    =============================== */
    const handleEnviarRespuesta = async () => {
        if (!formularioValido()) {
            setError('Por favor complete todos los campos obligatorios correctamente');
            return;
        }

        try {
            setEnviando(true);
            setError('');

            if (respuesta === 'correcciones') {
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

                if (!res.ok) throw new Error();

                setSuccess('La solicitud fue devuelta correctamente para correcciones.');
            }

            if (respuesta === 'certificacion') {
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

                if (!res.ok) throw new Error();

                setSuccess('La certificación fue enviada correctamente.');
            }

        } catch (err) {
            console.log(err);
            setError('Ocurrió un error al enviar la respuesta.');
        } finally {
            setEnviando(false);
        }
    };

    /* ===============================
       UI
    =============================== */
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

                {/* Datos del solicitante (Solo lectura) */}
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
                    {archivos.length > 0 ? (
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
                    ) : (
                        <p>No hay archivos cargados.</p>
                    )}
                </div>

                {/* Historial de respuestas - CON MODAL */}
                {solicitud.historial && solicitud.historial.length > 0 && (
                    <div className="form-group">
                        <label>Historial</label>
                        <div className="historial-tabla">
                            <div className="historial-header-row">
                                <div className="historial-col-fecha">Fecha devolución</div>
                                <div className="historial-col-comentario">Comentario</div>
                                <div className="historial-col-accion">Acción</div>
                            </div>

                            {solicitud.historial.map((item, index) => (
                                <div key={index} className="historial-body-row">
                                    {/* FECHA */}
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

                                    {/* COMENTARIO TRUNCADO */}
                                    <div className="historial-col-comentario-content">
                                        {item.comentario && (
                                            <div className="historial-texto-wrapper">
                                                <div className="historial-texto">
                                                    {item.comentario.length > MAX_CARACTERES_COMENTARIO
                                                        ? `${item.comentario.substring(0, MAX_CARACTERES_COMENTARIO)}...`
                                                        : item.comentario}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* BOTÓN VER MÁS */}
                                    <div className="historial-col-accion-content">
                                        {item.comentario && item.comentario.length > MAX_CARACTERES_COMENTARIO && (
                                            <button
                                                type="button"
                                                className="btn-ver-comentario"
                                                onClick={() => setComentarioCompleto(item)}
                                                title="Ver comentario completo"
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Respuesta */}
                <div className="form-group">
                    <label>Respuesta a solicitud</label>
                    <select
                        value={respuesta}
                        onChange={handleRespuestaChange}
                        disabled={enviando}
                    >
                        <option value="">Seleccione</option>
                        <option value="correcciones">
                            Realizar correcciones
                        </option>
                        <option value="certificacion">
                            Enviar certificación
                        </option>
                    </select>
                </div>

                {/* Campo Comentario - Solo si se selecciona "Realizar correcciones" */}
                {respuesta === 'correcciones' && (
                    <div className="form-group">
                        <label>
                            Comentarios <span className="required">*</span>
                        </label>
                        <textarea
                            value={comentario}
                            onChange={handleComentarioChange}
                            placeholder={`Ingrese un comentario (mínimo ${COMENTARIO_MIN}, máximo ${COMENTARIO_MAX} caracteres)`}
                            maxLength={COMENTARIO_MAX}
                            disabled={enviando}
                            rows={5}
                        />
                        <div className="caracteres-contador">
                            {comentario.length}/{COMENTARIO_MAX} caracteres
                        </div>
                        {errores.comentario && (
                            <div className="error-message">{errores.comentario}</div>
                        )}
                    </div>
                )}

                {/* Campo Archivos - Solo si se selecciona "Enviar certificación" */}
                {respuesta === 'certificacion' && (
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

                        {/* Mostrar error si existe */}
                        {error && (
                            <div className="error-message-archivos">
                                {error}
                            </div>
                        )}

                        {/* Lista de archivos seleccionados */}
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
                )}

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

                {/* MODAL DE ÉXITO */}
                <SuccessModal
                    message={success}
                    onClose={() => {
                        setSuccess("");
                        navigate(redirectPath);
                    }}
                />

                {/* MODAL DE COMENTARIO COMPLETO */}
                {comentarioCompleto && (
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
                )}
            </div>
        </div>
    );
};

export default RespuestaSolicitud;