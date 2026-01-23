import React, { useEffect, useState } from 'react';
import '../../styles/ResponderSolicitudes.css';
import { useParams, useNavigate } from "react-router-dom";

const API_URL = 'http://localhost:5195';

const RespuestaSolicitud = () => {
    const { numeroSolicitud } = useParams();
    const navigate = useNavigate();

    const [solicitud, setSolicitud] = useState(null);
    const [archivos, setArchivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [respuesta, setRespuesta] = useState("");

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

    const handleEnviarRespuesta = () => {
        if (!respuesta) {
            alert("Seleccione una opción de respuesta");
            return;
        }
        // Aquí se haría el POST o PATCH a la API para actualizar la solicitud
        console.log("Respuesta enviada:", respuesta);
        alert("Respuesta enviada correctamente");
        navigate(-1);
    };

    if (loading) return <p>Cargando solicitud...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div className="respuesta-solicitud-container">
            <h2>Respuesta nueva solicitud #{solicitud.numeroSolicitud}</h2>

            <div className="form-group">
                <label>Número de Cédula:</label>
                <input readOnly value={solicitud.cedula || ""} />
            </div>

            <div className="form-group">
                <label>Nombre completo:</label>
                <input readOnly value={solicitud.nombre || ""} />
            </div>

            <div className="form-group">
                <label>Documentos de la solicitud:</label>
                {archivos.length > 0 ? (
                    <table className="archivos-table">
                        <thead>
                            <tr>
                                <th>Documento</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {archivos.map((archivo) => (
                                <tr key={archivo.id}>
                                    <td>{archivo.nombreOriginal}</td>
                                    <td>
                                        <a
                                            href={`${API_URL}/api/Solicitudes/archivo/${archivo.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Ver archivo"
                                        >
                                            👁️
                                        </a>
                                        {" "}
                                        <a
                                            href={`${API_URL}/api/Solicitudes/archivo/${archivo.id}`}
                                            download={archivo.nombreOriginal}
                                            title="Descargar archivo"
                                        >
                                            ⬇️
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No hay archivos cargados.</p>
                )}
            </div>

            <div className="form-group">
                <label>Respuesta a solicitud:</label>
                <select value={respuesta} onChange={(e) => setRespuesta(e.target.value)}>
                    <option value="">Seleccione</option>
                    <option value="correcciones">Realizar correcciones</option>
                    <option value="certificacion">Enviar certificación</option>
                </select>
            </div>

            <div className="botones-respuesta">
                <button onClick={handleEnviarRespuesta} className="btn-primary">
                    Enviar respuesta
                </button>
                <button onClick={() => navigate(-1)} className="btn-secondary">
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default RespuestaSolicitud;
