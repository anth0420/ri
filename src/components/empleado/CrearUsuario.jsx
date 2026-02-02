import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/CrearUsuario.css';

const API_URL = import.meta.env.VITE_API_URL;

const CrearUsuario = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        nombreUsuario: '',
        nombreCompleto: '',
        correo: '',
        rol: 'Verificador',
        activo: true
    });

    const [buscando, setBuscando] = useState(false);
    const [usuarioBuscado, setUsuarioBuscado] = useState(false);
    const [guardando, setGuardando] = useState(false);

    /* ===============================
       BUSCAR USUARIO EN AD
    =============================== */
    const buscarUsuarioAD = async () => {
        if (!formData.nombreUsuario.trim()) {
            alert('Por favor ingrese un nombre de usuario');
            return;
        }

        try {
            setBuscando(true);
            const response = await fetch(
                `${API_URL}/api/ActiveDirectory/buscar?username=${encodeURIComponent(formData.nombreUsuario)}`
            );

            if (!response.ok) {
                throw new Error('Usuario no encontrado');
            }

            const data = await response.json();

            if (!data || !data.nombreCompleto) {
                alert('No se encontraron resultados para el dato consultado.');
                return;
            }

            setFormData(prev => ({
                ...prev,
                nombreCompleto: data.nombreCompleto || '',
                correo: data.correo || ''
            }));

            setUsuarioBuscado(true);
        } catch (error) {
            console.error(error);
            alert('No se encontraron resultados para el dato consultado.');
        } finally {
            setBuscando(false);
        }
    };

    /* ===============================
       CAMBIOS EN FORMULARIO
    =============================== */
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Si cambia el nombre de usuario, resetear los campos buscados
        if (name === 'nombreUsuario') {
            setUsuarioBuscado(false);
            setFormData(prev => ({
                ...prev,
                nombreCompleto: '',
                correo: ''
            }));
        }
    };

    const handleRolChange = (rol) => {
        setFormData(prev => ({
            ...prev,
            rol
        }));
    };

    const handleEstadoChange = () => {
        setFormData(prev => ({
            ...prev,
            activo: !prev.activo
        }));
    };

    /* ===============================
       VALIDACIÓN
    =============================== */
    const formularioCompleto = () => {
        return (
            formData.nombreUsuario.trim() !== '' &&
            formData.nombreCompleto.trim() !== '' &&
            formData.correo.trim() !== '' &&
            formData.rol !== '' &&
            usuarioBuscado
        );
    };

    /* ===============================
       GUARDAR USUARIO
    =============================== */
    const handleAgregar = async () => {
        if (!formularioCompleto()) {
            return;
        }

        try {
            setGuardando(true);

            const response = await fetch(`${API_URL}/api/Usuarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombreUsuario: formData.nombreUsuario,
                    nombre: formData.nombreCompleto,
                    correo: formData.correo,
                    rol: formData.rol,
                    activo: formData.activo
                })
            });

            if (!response.ok) {
                throw new Error('Error al crear usuario');
            }

            alert('Usuario creado con éxito');
            navigate('/admin/usuarios');
        } catch (error) {
            console.error(error);
            alert('Error al crear el usuario. Por favor intente nuevamente.');
        } finally {
            setGuardando(false);
        }
    };

    /* ===============================
       CANCELAR
    =============================== */
    const handleCancelar = () => {
        navigate('/admin');
    };

    /* ===============================
       ENTER KEY
    =============================== */
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && formData.nombreUsuario.trim()) {
            buscarUsuarioAD();
        }
    };

    /* ===============================
       UI
    =============================== */
    return (
        <div className="modal-overlay-crear">
            <div className="modal-crear">
                <h2 className="modal-title">Agregar nuevo usuario</h2>

                <div className="form-group">
                    <label className="form-label">Nombre de usuario</label>
                    <div className="search-group">
                        <input
                            type="text"
                            name="nombreUsuario"
                            value={formData.nombreUsuario}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            className="form-input"
                            placeholder="Nombre de usuario en Active Directory"
                            disabled={buscando}
                        />
                        <button
                            onClick={buscarUsuarioAD}
                            disabled={buscando || !formData.nombreUsuario.trim()}
                            className="btn-search"
                        >
                            {buscando ? '...' : '🔍'}
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Nombre completo</label>
                    <input
                        type="text"
                        name="nombreCompleto"
                        value={formData.nombreCompleto}
                        className="form-input"
                        disabled
                        placeholder="Se completará automáticamente"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Correo electrónico</label>
                    <input
                        type="email"
                        name="correo"
                        value={formData.correo}
                        className="form-input"
                        disabled
                        placeholder="Se completará automáticamente"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Seleccionar rol:</label>
                    <div className="radio-group">
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="rol"
                                value="Verificador"
                                checked={formData.rol === 'Verificador'}
                                onChange={() => handleRolChange('Verificador')}
                            />
                            <span>Verificador</span>
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="rol"
                                value="Lector"
                                checked={formData.rol === 'Lector'}
                                onChange={() => handleRolChange('Lector')}
                            />
                            <span>Lector</span>
                        </label>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Estado:</label>
                    <div className="toggle-container-form">
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={formData.activo}
                                onChange={handleEstadoChange}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                        <span className="toggle-label">
                            {formData.activo ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                </div>

                <div className="modal-actions-crear">
                    <button
                        onClick={handleCancelar}
                        className="btn-cancelar"
                        disabled={guardando}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAgregar}
                        disabled={!formularioCompleto() || guardando}
                        className={`btn-agregar ${!formularioCompleto() ? 'disabled' : ''}`}
                    >
                        {guardando ? 'Guardando...' : 'Agregar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CrearUsuario;