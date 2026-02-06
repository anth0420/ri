import { useState, useEffect } from "react";
import "../../styles/ConsultarSolicitud.css";
import logo from "../../assets/logo.png";
import SuccessModal from "../SuccessModal";
import { useNavigate } from "react-router-dom";


const API_URL = import.meta.env.VITE_API_URL;

const ConsultarSolicitud = () => {

    const [numeroSolicitud, setNumeroSolicitud] = useState("");
    const [solicitud, setSolicitud] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [archivosNuevos, setArchivosNuevos] = useState([]);
    const [enviandoArchivos, setEnviandoArchivos] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();


    const MAX_CARACTERES_COMENTARIO = 30; // Para mostrar en tabla

    // NUEVO: Estado para el modal de comentario
    const [comentarioCompleto, setComentarioCompleto] = useState(null);


    const EXTENSIONES_PERMITIDAS = [".pdf", ".jpg", ".jpeg", ".png"];
    const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB

    // ✅ Leer parámetro de URL al cargar el componente
    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const numeroParam = params.get('numero');

        if (numeroParam && /^\d{7}$/.test(numeroParam)) {
            setNumeroSolicitud(numeroParam);
            setTimeout(() => {
                buscarSolicitudPorNumero(numeroParam);
            }, 500);
        }
    }, []);

    const esNumeroValido = /^\d{7}$/.test(numeroSolicitud);

    const handleNumeroChange = (e) => {
        const value = e.target.value;

        if (!/^\d*$/.test(value)) {
            setError("Este campo solo acepta valores numéricos.");
            return;
        }

        setError("");
        setNumeroSolicitud(value);
        setSolicitud(null);
        setArchivosNuevos([]);
    };

    const buscarSolicitud = async () => {
        if (!esNumeroValido) return;
        await buscarSolicitudPorNumero(numeroSolicitud);
    };

    const buscarSolicitudPorNumero = async (numero) => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `${API_URL}/api/Solicitudes/${numero}`
            );

            if (!response.ok) {
                throw new Error("Número de solicitud incorrecto, favor verificar.");
            }

            const data = await response.json();
            setSolicitud(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const obtenerNombreEstado = (estadoNumerico) => {
        const estados = {
            1: "Nueva",
            2: "En Revisión",
            3: "Completada",
            4: "Rechazada",
            5: "Pendiente de respuesta",
            6: "Respuesta de usuario"
        };
        return estados[estadoNumerico] || "Desconocido";
    };

    const estadoMostrar = () => {
        if (!solicitud) return "";

        if (typeof solicitud.estado === 'number') {
            return obtenerNombreEstado(solicitud.estado);
        }

        return solicitud.estado || "Pendiente";
    };

    const puedeSubirArchivos = () => {
        if (!solicitud) return false;

        if (typeof solicitud.estado === 'number') {
            return solicitud.estado === 5;
        }

        return solicitud.estado === "PendienteRespuesta" || solicitud.estado === "Pendiente de respuesta";
    };

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

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const nuevosArchivos = [];
        let errores = [];

        for (const file of files) {
            const errorValidacion = validarArchivo(file);
            if (errorValidacion) {
                errores.push(`${file.name}: ${errorValidacion}`);
            } else {
                nuevosArchivos.push(file);
            }
        }

        if (errores.length > 0) {
            setError(errores.join("\n"));
            return;
        }

        setError("");
        setArchivosNuevos([...archivosNuevos, ...nuevosArchivos]);
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
        let errores = [];

        for (const file of files) {
            const errorValidacion = validarArchivo(file);
            if (errorValidacion) {
                errores.push(`${file.name}: ${errorValidacion}`);
            } else {
                nuevosArchivos.push(file);
            }
        }

        if (errores.length > 0) {
            setError(errores.join("\n"));
            return;
        }

        setError("");
        setArchivosNuevos([...archivosNuevos, ...nuevosArchivos]);
    };

    const eliminarArchivo = (index) => {
        setArchivosNuevos(archivosNuevos.filter((_, i) => i !== index));
    };

    const enviarArchivosActualizados = async () => {
        if (archivosNuevos.length === 0) {
            setError("Debes cargar al menos un documento.");
            return;
        }

        setEnviandoArchivos(true);
        setError("");
        setSuccess("");

        try {
            const formData = new FormData();
            archivosNuevos.forEach((archivo) => formData.append("Archivos", archivo));

            const response = await fetch(
                `${API_URL}/api/Solicitudes/${numeroSolicitud}/archivos`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (response.ok) {
                setArchivosNuevos([]);
                await buscarSolicitudPorNumero(numeroSolicitud);
                setSuccess("Documentos enviados exitosamente. Su solicitud ha sido actualizada.");
            } else {
                const errorData = await response.text();
                setError(`Error al actualizar archivos: ${errorData}`);
            }
        } catch (error) {
            console.error(error);
            setError("Hubo un problema de comunicación con el servidor.");
        } finally {
            setEnviandoArchivos(false);
        }
    };

    return (
        <div>
            <div className="modal-overlay-s">
                <div className="consulta-container">
                    <div className="consulta-header">
                        <img src={logo} alt="Registro Inmobiliario" className="consulta-logo" />
                    </div>

                    <h2 className="consulta-title">Verificar estatus de solicitud</h2>


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
                    {error && <div className="error-message-consulta">{error}</div>}

                    <div className="form-group-consulta">
                        <label>Nombre completo</label>
                        <input readOnly className="input-consulta" value={solicitud?.nombre || ""} />
                    </div>

                    <div className="form-group-consulta">
                        <label>Correo electrónico</label>
                        <input readOnly className="input-consulta" value={solicitud?.correo || ""} />
                    </div>

                    <div className="form-group-consulta">
                        <label>Estado</label>
                        <input readOnly className="input-consulta" value={estadoMostrar()} />
                    </div>

                    {puedeSubirArchivos() && (
                        <div className="section-consulta">
                            <div className="section-title">Actualizar documentos</div>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                                Su solicitud requiere correcciones. Por favor, cargue los documentos actualizados.
                            </p>
                            <div
                                className={`upload-box-consulta ${isDragging ? 'dragging' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => !enviandoArchivos && document.getElementById('file-upload-consulta').click()}
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
                                        : "Arrastra o selecciona documentos"}
                                </p>
                                <small>Formatos permitidos: PDF, JPG, JPEG, PNG (máx. 5MB cada uno)</small>
                            </div>

                            {archivosNuevos.length > 0 && (
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
                            )}

                            {archivosNuevos.length > 0 && (
                                <button
                                    className="btn-enviar-archivos"
                                    onClick={enviarArchivosActualizados}
                                    disabled={enviandoArchivos}
                                >
                                    {enviandoArchivos ? "Enviando..." : "Enviar documentos"}
                                </button>
                            )}
                        </div>
                    )}

                    {solicitud?.archivosActuales?.length > 1 && (
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
                                            Ver
                                        </a>
                                    </div>
                                ))}

                            </div>
                        </div>
                    )}


                    {solicitud?.historial?.length > 0 && (
                        <div className="form-group">
                            <div className="section-title">Historial de correcciones</div>

                            <div className="historial-tabla">
                                <div className="historial-header-row">
                                    <div className="historial-col-fecha">Fecha devolución</div>
                                    <div className="historial-col-comentario">Comentario</div>
                                </div>
                                

                                {solicitud.historial.map((item, index) => (
                                    <div key={index} className="historial-body-row">
                                        {/* Fecha */}
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

                                        {/* Comentario truncado */}
                                        <div className="historial-col-comentario-content">
                                            {item.comentario && (
                                                <div
                                                    className={`historial-texto-wrapper ${item.comentario.length > MAX_CARACTERES_COMENTARIO
                                                            ? "clickeable"
                                                            : ""
                                                        }`}
                                                    onClick={() => {
                                                        if (item.comentario.length > MAX_CARACTERES_COMENTARIO) {
                                                            setComentarioCompleto(item);
                                                        }
                                                    }}
                                                    title={
                                                        item.comentario.length > MAX_CARACTERES_COMENTARIO
                                                            ? "Ver comentario completo"
                                                            : ""
                                                    }
                                                >
                                                    <div className="historial-texto">
                                                        {item.comentario.length > MAX_CARACTERES_COMENTARIO
                                                            ? `${item.comentario.substring(0, MAX_CARACTERES_COMENTARIO)}...`
                                                            : item.comentario}
                                                    </div>
                                                </div>
                                            )}

                                        </div>

                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        className="btn-aceptar"
                        onClick={() => navigate('/')}
                    >
                        Aceptar
                    </button>
                </div>
            </div>

            {/* ✅ Modal de éxito movido FUERA del modal-overlay para que aparezca por encima */}
            <SuccessModal
                message={success}
                onClose={() => {
                    setSuccess("");
                    navigate('/');
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
    );
};

export default ConsultarSolicitud;