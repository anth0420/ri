import React, { useState, useCallback } from "react";
import "../../styles/CrearUsuario.css";

const API_URL = import.meta.env.VITE_API_URL;

// ==================== CONSTANTES ====================

const ROLES = ['Validador', 'Lector'];

// ==================== COMPONENTE PRINCIPAL ====================

const EditarUsuario = ({ usuario, onClose, onSuccess }) => {
    // ==================== ESTADO ====================

    const [rolActual, setRolActual] = useState(usuario.rol);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    // ==================== FUNCIONES DE VALIDACIÓN ====================

    const hayCambios = useCallback(() => {
        return rolActual !== usuario.rol;
    }, [rolActual, usuario.rol]);

    // ==================== FUNCIONES DE API ====================

    const guardarCambios = useCallback(async () => {
        if (!hayCambios()) return;

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
    }, [hayCambios, rolActual, usuario.id, onSuccess]);

    // ==================== MANEJADORES DE EVENTOS ====================

    const handleRolChange = useCallback((rol) => {
        setRolActual(rol);
        setError(null);
    }, []);

    const handleGuardar = useCallback(() => {
        guardarCambios();
    }, [guardarCambios]);

    // ==================== RENDER - CAMPOS DE SOLO LECTURA ====================

    const renderCamposSoloLectura = () => (
        <>
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
        </>
    );

    // ==================== RENDER - SELECTOR DE ROL ====================

    const renderSelectorRol = () => (
        <div className="form-group">
            <label className="form-label">Seleccionar rol:</label>
            <div className="radio-group">
                {ROLES.map(rol => (
                    <label className="radio-label" key={rol}>
                        <input
                            type="radio"
                            name="rol"
                            value={rol}
                            checked={rolActual === rol}
                            onChange={() => handleRolChange(rol)}
                            disabled={guardando}
                        />
                        <span>{rol}</span>
                    </label>
                ))}
            </div>
        </div>
    );

    // ==================== RENDER - INDICADOR DE CAMBIO ====================

    const renderIndicadorCambio = () => {
        if (!hayCambios()) return null;

        return (
            <div className="cambio-pendiente">
                Rol actual: <strong>{usuario.rol}</strong> → Nuevo rol: <strong>{rolActual}</strong>
            </div>
        );
    };

    // ==================== RENDER PRINCIPAL ====================

    return (
        <div className="modal-overlay-crear">
            <div className="modal-crear">
                <h2 className="modal-title">Editar usuario</h2>

                {renderCamposSoloLectura()}
                {renderSelectorRol()}
                {renderIndicadorCambio()}

                {error && (
                    <div className="error-message">{error}</div>
                )}

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
                        disabled={!hayCambios() || guardando}
                        className={`btn-agregar ${!hayCambios() ? "disabled" : ""}`}
                    >
                        {guardando ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditarUsuario;