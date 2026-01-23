import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/general.css";
import logo from "../../assets/logo.png";

const ExencionPasantia = () => {
    const navigate = useNavigate(); // Hook de navegación

    return (
        <div className="page-container">
            <div className="card-container">

                {/* Header */}
                <div className="header">
                    <img
                        src={logo}
                        alt="Registro Inmobiliario"
                        className="logo"
                    />
                </div>

                {/* Title */}
                <h2 className="title">SOLICITUD DE EXENCIÓN DE PASANTÍA</h2>

                {/* Description */}
                <p className="description">
                    Servicio en línea que permite a los Agrimensores egresados
                    depositar la documentación requerida para la Certificación
                    de Exención de Pasantía.
                </p>

                {/* Observations */}
                <div className="observations">
                    <p className="observations-title">
                        Antes de iniciar el proceso de solicitud, debes tomar en cuenta las siguientes observaciones:
                    </p>
                    <ol>
                        <li>
                            <strong>Disponibilidad de Documentos:</strong> Deberás tener toda la
                            documentación requerida en formato digital.
                        </li>
                        <li>
                            <strong>Contacto y Notificaciones:</strong> Es imprescindible contar
                            con un correo electrónico activo para recibir la respuesta a tu
                            solicitud y todas las notificaciones relacionadas con el proceso.
                        </li>
                    </ol>
                </div>

                {/* Buttons */}
                <div className="button-group">
                    <button
                        className="btn-primary"
                        onClick={() => navigate("/crear-solicitud")}
                        type="button"
                    >
                        Crear nueva<br />solicitud
                    </button>

                    <button
                        className="btn-secondary"
                        onClick={() => navigate("/verificar-estatus")}
                        type="button"
                    >
                        Verificar estatus de<br />solicitud
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ExencionPasantia;
