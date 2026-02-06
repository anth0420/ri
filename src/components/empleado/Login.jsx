import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Login.css";
import logo from "../../assets/logo.png";

const API_URL = import.meta.env.VITE_API_URL;

// ==================== CONSTANTES ====================

const ENDPOINTS = {
    VALIDAR_USUARIO: `${API_URL}/api/Usuarios/validar-usuario`,
    VALIDAR_AD: `${API_URL}/api/ActiveDirectory/validate`,
    VALIDAR_PASSWORD: `${API_URL}/api/Usuarios/validar-password`,
    LOGIN: `${API_URL}/api/Usuarios/login`,
};

const RUTAS = {
    ADMIN: "/admin",
    EMPLEADO: "/empleado/gestor-solicitudes",
};

// ==================== COMPONENTE PRINCIPAL ====================

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    // ==================== ESTADO ====================

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // ==================== FUNCIONES DE API ====================

    const validarUsuarioEnSistema = useCallback(async (username) => {
        const response = await fetch(ENDPOINTS.VALIDAR_USUARIO, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error de validación");
        }

        return true;
    }, []);

    const validarEnActiveDirectory = useCallback(async (username, password) => {
        const response = await fetch(ENDPOINTS.VALIDAR_AD, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        return response.ok && data.autenticado;
    }, []);

    const validarPassword = useCallback(async (username, adValido) => {
        const response = await fetch(ENDPOINTS.VALIDAR_PASSWORD, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, adValido }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Error de autenticación");
        }

        return data;
    }, []);

    const obtenerDatosLogin = useCallback(async (username) => {
        const response = await fetch(ENDPOINTS.LOGIN, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Acceso denegado");
        }

        return data;
    }, []);

    // ==================== FUNCIONES DE AUTENTICACIÓN ====================

    const procesarLogin = useCallback(async (username, password) => {
        try {
            setLoading(true);
            setError("");

            // 1. Validar en el sistema
            await validarUsuarioEnSistema(username);

            // 2. Validar en Active Directory
            const adValido = await validarEnActiveDirectory(username, password);

            // 3. Validar password en el sistema
            await validarPassword(username, adValido);

            // 4. Obtener datos de login
            const loginData = await obtenerDatosLogin(username);

            // 5. Guardar sesión
            login({
                username,
                rol: loginData.rol,
                nombre: loginData.nombre,
            });

            // 6. Redireccionar según rol
            const rutaDestino = loginData.rol === "admin" ? RUTAS.ADMIN : RUTAS.EMPLEADO;
            navigate(rutaDestino);
        } catch (err) {
            setError(err.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    }, [
        validarUsuarioEnSistema,
        validarEnActiveDirectory,
        validarPassword,
        obtenerDatosLogin,
        login,
        navigate
    ]);

    // ==================== MANEJADORES DE EVENTOS ====================

    const handleSubmit = useCallback((e) => {
        e.preventDefault();

        if (!username.trim() || !password.trim()) {
            setError("Por favor ingrese usuario y contraseña");
            return;
        }

        procesarLogin(username, password);
    }, [username, password, procesarLogin]);

    const handleUsernameChange = useCallback((e) => {
        setUsername(e.target.value);
        setError("");
    }, []);

    const handlePasswordChange = useCallback((e) => {
        setPassword(e.target.value);
        setError("");
    }, []);

    // ==================== RENDER - FORMULARIO ====================

    const renderFormulario = () => (
        <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
                <label htmlFor="username">Nombre de usuario</label>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    required
                    disabled={loading}
                    autoComplete="username"
                />
            </div>

            <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                />
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <button
                type="submit"
                className="login-button"
                disabled={loading || !username.trim() || !password.trim()}
            >
                {loading ? "Verificando..." : "Iniciar sesión"}
            </button>
        </form>
    );

    // ==================== RENDER - LOGO ====================

    const renderLogo = () => (
        <div className="login-logo">
            <img
                src={logo}
                alt="Registro Inmobiliario República Dominicana"
            />
        </div>
    );

    // ==================== RENDER PRINCIPAL ====================

    return (
        <div className="login-container">
            {/* Sección izquierda */}
            <div className="login-left">
                <h1 className="login-title">
                    Bienvenido al sistema
                    <br />
                    de emisión de
                    <br />
                    certificaciones
                </h1>
            </div>

            {/* Sección derecha */}
            <div className="login-right">
                <div className="login-card">
                    {renderLogo()}
                    {renderFormulario()}
                </div>
            </div>
        </div>
    );
}