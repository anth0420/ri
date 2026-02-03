import React, { useState } from "react";
import "../../styles/CrearUsuario.css";

const API_URL = import.meta.env.VITE_API_URL;

const EditarUsuario = ({ usuario, onClose, onSuccess }) => {
    /* ===============================
       ESTADO
    =============================== */
    const [rolActual, setRolActual] = useState(usuario.rol);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    /* ===============================
       DETECTAR CAMBIOS
    =============================== */
    const haycambios = rolActual !== usuario.rol;

    /* ===============================
       CAMBIAR ROL → API
    =============================== */
    const handleGuardar = async () => {
        if (!haycambios) return;

        try {
            setGuardando(true);
            setError(null);

            const response = await fetch(`${API_URL}/api/Usuarios/${usuario.id}/rol`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ rol: rolActual }),
            });

            if (!response.ok) {
                const mensajeError = await response.text();
                throw new Error(mensajeError || "Error al actualizar el rol");
            }

            onSuccess();
        } catch (err) {
            console.error(err);
            setError(err.message || "Error al guardar los cambios. Intente nuevamente.");
        } finally {
            setGuardando(false);
        }
    };

    /* ===============================
       UI
    =============================== */
    return (
        <div className="modal-overlay-crear">
            <div className="modal-crear">
                <h2 className="modal-title">Editar usuario</h2>

                {/* Datos de solo lectura */}
                <div className="form-group">
                    <label className="form-label">Nombre completo</label>
                    <input
                        type="text"
                        value={usuario.nombre}
                        className="form-input"
                        disabled
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Correo electrónico</label>
                    <input
                        type="email"
                        value={usuario.correo}
                        className="form-input"
                        disabled
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Estado actual</label>
                    <input
                        type="text"
                        value={usuario.activo ? "Activo" : "Inactivo"}
                        className="form-input"
                        disabled
                    />
                </div>

                {/* Rol editable con radios */}
                <div className="form-group">
                    <label className="form-label">Seleccionar rol:</label>
                    <div className="radio-group">
                        {["Validador", "Lector"].map((rol) => (
                            <label className="radio-label" key={rol}>
                                <input
                                    type="radio"
                                    name="rol"
                                    value={rol}
                                    checked={rolActual === rol}
                                    onChange={() => {
                                        setRolActual(rol);
                                        setError(null);
                                    }}
                                    disabled={guardando}
                                />
                                <span>{rol}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Indicador de cambio pendiente */}
                {haycambios && (
                    <div className="cambio-pendiente">
                        Rol actual: <strong>{usuario.rol}</strong> → Nuevo rol: <strong>{rolActual}</strong>
                    </div>
                )}

                {/* Mensaje de error */}
                {error && (
                    <div className="error-message">{error}</div>
                )}

                {/* Acciones */}
                <div className="modal-actions-crear">
                    <button
                        onClick={onClose}
                        className="btn-cancelar"
                        disabled={guardando}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGuardar}
                        disabled={!haycambios || guardando}
                        className={`btn-agregar ${!haycambios ? "disabled" : ""}`}
                    >
                        {guardando ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditarUsuario;