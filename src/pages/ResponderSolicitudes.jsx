import React, { useEffect, useState } from 'react';
import '../styles/ResponderSolicitudes.css'

const API_URL = 'http://localhost:5195';

const RespuestaSolicitud = ({ numeroSolicitud, onBack }) => {
    /* ===============================
       ESTADO
    =============================== */
    const [solicitud, setSolicitud] = useState(null);
    const [respuesta, setRespuesta] = useState('');
    const [loading, setLoading] = useState(true);
    const [enviando, setEnviando] = useState(false);

    /* ===============================
       CARGA DE SOLICITUD
    =============================== */
    useEffect(() => {
        const fetchSolicitud = async () => {
            try {
                const res = await fetch(
                    `${API_URL}/api/Solicitudes/${numeroSolicitud}`
                );

                if (!res.ok) throw new Error();

                const data = await res.json();
                setSolicitud(data);
            } catch (error) {
                alert('Error al cargar la solicitud');
            } finally {
                setLoading(false);
            }
        };

        if (numeroSolicitud) fetchSolicitud();
    }, [numeroSolicitud]);

    /* ===============================
       ENVÍO DE RESPUESTA
    =============================== */
    const handleEnviarRespuesta = async () => {
        if (!respuesta) {
            alert('Debe seleccionar una respuesta');
            return;
        }

        try {
            setEnviando(true);

            const res = await fetch(
                `${API_URL}/api/Solicitudes/${numeroSolicitud}/responder`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tipoRespuesta: respuesta,
                    }),
                }
            );

            if (!res.ok) throw new Error();

            alert('Respuesta enviada correctamente');
            onBack();
        } catch (error) {
            alert('Error al enviar la respuesta');
        } finally {
            setEnviando(false);
        }
    };

    /* ===============================
       UI
    =============================== */
    if (loading) {
        return <div className="respuesta-loading">Cargando solicitud...</div>;
    }

    if (!solicitud) {
        return <div className="respuesta-error">Solicitud no encontrada</div>;
    }

    return (
        <div className="respuesta-wrapper">
            <div className="respuesta-card">
                <h2 className="respuesta-title">Respuesta nueva solicitud</h2>

                {/* Datos del solicitante */}
                <div className="respuesta-form">
                    <div className="form-group">
                        <label>Número de cédula</label>
                        <input
                            type="text"
                            value={solicitud.cedula || ''}
                            disabled
                        />
                    </div>

                    <div className="form-group">
                        <label>Nombre completo</label>
                        <input
                            type="text"
                            value={solicitud.nombre || ''}
                            disabled
                        />
                    </div>
                </div>

                {/* Documentos */}
                <div className="respuesta-docs">
                    <h3>Documentos de la solicitud</h3>

                    {solicitud.archivos?.length === 0 ? (
                        <p className="docs-empty">
                            No hay documentos anexados
                        </p>
                    ) : (
                        <table className="docs-table">
                            <thead>
                                <tr>
                                    <th>Documento</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {solicitud.archivos.map((doc) => (
                                    <tr key={doc.id}>
                                        <td>{doc.nombre}</td>
                                        <td className="docs-actions">
                                            <a
                                                href={`${API_URL}/${doc.ruta}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                title="Ver documento"
                                            >
                                                👁
                                            </a>
                                            <a
                                                href={`${API_URL}/${doc.ruta}`}
                                                download
                                                title="Descargar documento"
                                            >
                                                ⬇
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Respuesta */}
                <div className="respuesta-seccion">
                    <label>Respuesta a solicitud</label>
                    <select
                        value={respuesta}
                        onChange={(e) => setRespuesta(e.target.value)}
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

                {/* Acciones */}
                <div className="respuesta-actions">
                    <button
                        className="btn-secondary"
                        onClick={onBack}
                        disabled={enviando}
                    >
                        Volver
                    </button>

                    <button
                        className="btn-primary"
                        onClick={handleEnviarRespuesta}
                        disabled={enviando}
                    >
                        {enviando ? 'Enviando...' : 'Enviar respuesta'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RespuestaSolicitud;
