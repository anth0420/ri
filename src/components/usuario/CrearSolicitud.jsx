import { useState } from "react";
import "../../styles/solicitud.css";
import logo from "../../assets/logo.png";
import SuccessModal from "../SuccessModal";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const API_NOMBRE_URL = "http://localhost:5195/api/Persona";

const CrearSolicitud = () => {
    const [form, setForm] = useState({
        cedula: "",
        nombre: "",
        correo: "",
        confirmarCorreo: "",
    });
    const navigate = useNavigate();
    const [archivos, setArchivos] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [buscandoNombre, setBuscandoNombre] = useState(false);

    // Estado de errores individuales por campo
    const [errors, setErrors] = useState({
        cedula: "",
        nombre: "",
        correo: "",
        confirmarCorreo: "",
        archivos: "",
        general: ""
    });

    const [success, setSuccess] = useState("");

    const EXTENSIONES_PERMITIDAS = [".pdf", ".jpg", ".jpeg", ".png"];
    const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB

    const formatearCedula = (value) => {
        // Eliminar todos los guiones
        const soloNumeros = value.replace(/-/g, '');

        // Limitar a 11 dígitos
        const numerosLimitados = soloNumeros.slice(0, 11);

        // Aplicar formato: XXX-XXXXXXX-X
        let cedulaFormateada = numerosLimitados;

        if (numerosLimitados.length > 3) {
            cedulaFormateada = numerosLimitados.slice(0, 3) + '-' + numerosLimitados.slice(3);
        }

        if (numerosLimitados.length > 10) {
            cedulaFormateada = numerosLimitados.slice(0, 3) + '-' + numerosLimitados.slice(3, 10) + '-' + numerosLimitados.slice(10);
        }

        return cedulaFormateada;
    };

    // Función para limpiar error de un campo específico
    const clearFieldError = (fieldName) => {
        setErrors(prev => ({ ...prev, [fieldName]: "" }));
    };

    // Función para establecer error de un campo específico
    const setFieldError = (fieldName, errorMessage) => {
        setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Limpiar error del campo cuando el usuario empieza a escribir
        clearFieldError(name);

        // Validar solo números y guiones en cédula (máx 11 dígitos + 2 guiones = 13 caracteres)
        if (name === "cedula") {
            const soloNumeros = value.replace(/[^0-9]/g, '');
            const cedulaFormateada = formatearCedula(soloNumeros);
            setForm({ ...form, [name]: cedulaFormateada });
            return;
        }

        // Validar solo letras y espacios en nombre (máx 50 caracteres)
        if (name === "nombre") {
            const soloLetrasYEspacios = value.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s]/g, '');
            if (soloLetrasYEspacios.length <= 50) {
                setForm({ ...form, [name]: soloLetrasYEspacios });
            }
            return;
        }

        // Validar correo (máx 50 caracteres)
        if (name === "correo" || name === "confirmarCorreo") {
            if (value.length <= 50) {
                setForm({ ...form, [name]: value });
            }
            return;
        }

        setForm({ ...form, [name]: value });
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
            setFieldError("archivos", errores.join("\n"));
            return;
        }

        clearFieldError("archivos");
        setArchivos([...archivos, ...nuevosArchivos]);
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
            setFieldError("archivos", errores.join("\n"));
            return;
        }

        clearFieldError("archivos");
        setArchivos([...archivos, ...nuevosArchivos]);
    };

    const eliminarArchivo = (index) => {
        setArchivos(archivos.filter((_, i) => i !== index));
    };

    const fetchNombrePorCedula = async (cedula) => {
        if (!cedula) return;

        // Validar que la cédula tenga 11 dígitos antes de buscar
        const cedulaLimpia = cedula.replace(/-/g, '');
        if (cedulaLimpia.length !== 11) {
            return;
        }

        try {
            setBuscandoNombre(true);
            clearFieldError("cedula"); // Limpiar error previo antes de buscar

            const res = await fetch(`${API_NOMBRE_URL}/por-cedula/${encodeURIComponent(cedulaLimpia)}`);

            if (res.ok) {
                const data = await res.json();
                if (data?.nombre) {
                    setForm((prev) => ({ ...prev, nombre: data.nombre }));
                    clearFieldError("cedula");
                    clearFieldError("nombre");
                } else {
                    // No se encontró el nombre
                    setFieldError("cedula", "No se encontraron resultados. Por favor, verifique el dato ingresado o ingresa el nombre completo");
                }
            } else {
                // Error en la respuesta
                setFieldError("cedula", "No se encontraron resultados. Por favor, verifique el dato ingresado o ingresa el nombre completo");
            }
        } catch {
            // Error de red
            setFieldError("cedula", "No se encontraron resultados. Por favor, verifique el dato ingresado o ingresa el nombre completo");
        } finally {
            setBuscandoNombre(false);
        }
    };

    const validarFormulario = () => {
        let isValid = true;
        const newErrors = {
            cedula: errors.cedula, // Mantener el error de búsqueda si existe
            nombre: "",
            correo: "",
            confirmarCorreo: "",
            archivos: "",
            general: ""
        };

        // Validar cédula solo si no tiene error previo de búsqueda
        if (!errors.cedula) {
            if (!form.cedula) {
                newErrors.cedula = "La cédula es obligatoria.";
                isValid = false;
            } else {
                const cedulaLimpia = form.cedula.replace(/-/g, '');
                if (cedulaLimpia.length !== 11) {
                    newErrors.cedula = "La cédula debe tener 11 dígitos.";
                    isValid = false;
                }
            }
        } else {
            // Si ya hay un error de búsqueda, el formulario no es válido
            isValid = false;
        }

        // Validar nombre
        if (!form.nombre) {
            newErrors.nombre = "El nombre es obligatorio.";
            isValid = false;
        }

        // Validar correo
        if (!form.correo) {
            newErrors.correo = "El correo electrónico es obligatorio.";
            isValid = false;
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(form.correo)) {
                newErrors.correo = "Por favor ingresa un correo electrónico válido.";
                isValid = false;
            }
        }

        // Validar confirmación de correo
        if (!form.confirmarCorreo) {
            newErrors.confirmarCorreo = "Debes confirmar el correo electrónico.";
            isValid = false;
        } else if (form.correo !== form.confirmarCorreo) {
            newErrors.confirmarCorreo = "Los correos no coinciden.";
            isValid = false;
        }

        // Validar archivos
        if (archivos.length === 0) {
            newErrors.archivos = "Debes cargar al menos un documento.";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        // Limpiar errores generales
        setErrors(prev => ({ ...prev, general: "" }));
        setSuccess("");

        // Validar formulario
        if (!validarFormulario()) {
            return;
        }

        setLoading(true);

        const data = new FormData();
        // Enviar cédula limpia sin guiones
        data.append("Cedula", form.cedula.replace(/-/g, ''));
        data.append("Nombre", form.nombre);
        data.append("Correo", form.correo);

        // Agregar múltiples archivos
        archivos.forEach((archivo) => {
            data.append("Archivos", archivo);
        });

        try {
            const response = await fetch(`${API_URL}/api/Solicitudes`, {
                method: "POST",
                body: data,
            });

            if (response.ok) {
                const resultado = await response.json();
                setSuccess(`Solicitud creada exitosamente. Número: ${resultado.numeroSolicitud}`);

                setForm({
                    cedula: "",
                    nombre: "",
                    correo: "",
                    confirmarCorreo: "",
                });
                setArchivos([]);
                setErrors({
                    cedula: "",
                    nombre: "",
                    correo: "",
                    confirmarCorreo: "",
                    archivos: "",
                    general: ""
                });
            } else {
                const errorData = await response.text();
                setFieldError("general", `Error al enviar la solicitud. Código: ${response.status}. ${errorData}`);
            }
        } catch (error) {
            setFieldError("general", "Hubo un problema de comunicación con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <SuccessModal
                message={success}
                onClose={() => {
                    setSuccess("");
                    navigate('/');
                }}
            />
            <div className="page-container">
                <div className="form-wrapper">
                    <div className="logo-container">
                        <img src={logo} alt="Registro Inmobiliario" className="logo" />
                    </div>

                    <h2 className="title">Crear nueva solicitud</h2>

                    <div>
                        <div className="form-group">
                            <label>Número de cédula</label>
                            <div className="input-with-button">
                                <input
                                    type="text"
                                    name="cedula"
                                    value={form.cedula}
                                    onChange={handleChange}
                                    onBlur={() => fetchNombrePorCedula(form.cedula)}
                                    className={`form-control input-cedula ${errors.cedula ? 'error' : ''}`}
                                    disabled={loading}
                                    placeholder="000-0000000-0"
                                    maxLength={13}
                                />
                                <button
                                    type="button"
                                    className="btn-search"
                                    onClick={() => fetchNombrePorCedula(form.cedula)}
                                    disabled={loading || buscandoNombre || !form.cedula}
                                >
                                    {buscandoNombre ? (
                                        <i className="bi bi-arrow-repeat spin"></i>
                                    ) : (
                                        <i className="bi bi-search"></i>
                                    )}
                                </button>
                            </div>
                            {errors.cedula && (
                                <span className="error-message">
                                    {errors.cedula}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Nombre completo</label>
                            <input
                                type="text"
                                name="nombre"
                                value={form.nombre}
                                onChange={handleChange}
                                className={`form-control ${errors.nombre ? 'error' : ''}`}
                                disabled={loading}
                                maxLength={50}
                            />
                            {errors.nombre && (
                                <span className="error-message">
                                    {errors.nombre}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Correo electrónico</label>
                            <input
                                type="email"
                                name="correo"
                                value={form.correo}
                                onChange={handleChange}
                                className={`form-control ${errors.correo ? 'error' : ''}`}
                                disabled={loading}
                                maxLength={50}
                            />
                            {errors.correo && (
                                <span className="error-message">
                                    {errors.correo}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Confirmar Correo electrónico</label>
                            <input
                                type="email"
                                name="confirmarCorreo"
                                value={form.confirmarCorreo}
                                onChange={handleChange}
                                className={`form-control ${errors.confirmarCorreo ? 'error' : ''}`}
                                disabled={loading}
                                maxLength={50}
                            />
                            {errors.confirmarCorreo && (
                                <span className="error-message">
                                    {errors.confirmarCorreo}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Documentos de la solicitud</label>
                            <div
                                className={`upload-box ${isDragging ? 'dragging' : ''} ${errors.archivos ? 'error' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => !loading && document.getElementById('file-upload').click()}
                            >
                                <input
                                    type="file"
                                    id="file-upload"
                                    onChange={handleFileChange}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    disabled={loading}
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
                                <p>{archivos.length > 0
                                    ? `${archivos.length} archivo(s) seleccionado(s)`
                                    : "Arrastra o selecciona documentos"}
                                </p>
                                <small>Formatos permitidos: PDF, JPG, JPEG, PNG (máx. 5MB cada uno)</small>
                            </div>

                            {archivos.length > 0 && (
                                <div style={{ marginTop: '10px' }}>
                                    {archivos.map((archivo, index) => (
                                        <div key={index} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px',
                                            marginBottom: '5px',
                                            backgroundColor: '#f5f5f5',
                                            borderRadius: '4px',
                                            fontSize: '0.85rem'
                                        }}>
                                            <span>{archivo.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    eliminarArchivo(index);
                                                }}
                                                style={{
                                                    background: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '4px 8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem'
                                                }}
                                                disabled={loading}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {errors.archivos && (
                                <span className="error-message">
                                    {errors.archivos}
                                </span>
                            )}
                        </div>

                        {errors.general && (
                            <div className="error-general">
                                {errors.general}
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            className="btn-submit"
                            disabled={loading}
                        >
                            {loading ? "Enviando..." : "Enviar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CrearSolicitud;