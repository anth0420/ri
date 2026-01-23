import React, { useState, useEffect, useMemo } from 'react';
import logo from '../../assets/logo.png';
import '../../styles/GestorSolicitudes.css';
import {useNavigate} from "react-router-dom"; 
const API_URL = 'http://localhost:5195';

const GestorSolicitudes = ({ onEditarSolicitud }) => {
    /* ===============================
       ESTADO
    =============================== */
    const [activeTab, setActiveTab] = useState('pendientes');
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    /* ===============================
       CARGA DE DATOS
    =============================== */
    useEffect(() => {
        fetchSolicitudes();
    }, []);

    const fetchSolicitudes = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/Solicitudes`);
            if (!response.ok) throw new Error();
            const data = await response.json();
            setSolicitudes(data);
        } catch (error) {
            console.error(error);
            alert('Error al cargar las solicitudes');
        } finally {
            setLoading(false);
        }
    };

    /* ===============================
       ESTADOS (ENUM VISUAL)
    =============================== */
    const getEstadoTexto = (estado) =>
    ({
        1: 'Nueva',
        2: 'En revisión',
        3: 'Aprobada',
        4: 'Rechazada',
        5: 'En espera del usuario',
        6: 'Respuesta del usuario',
    }[estado] || 'Desconocido');

    const getEstadoPrioridad = (estado) =>
    ({
        6: 1,
        1: 2,
        5: 3,
    }[estado] || 99);

    /* ===============================
       FECHAS (FORMA PROFESIONAL)
       - Prioriza fechaDevolucion
       - Luego fechaCreacion
       - Formato largo en español RD
    =============================== */
    const obtenerFechaVisual = (solicitud) =>
        solicitud?.fechaDevolucion || solicitud?.fechaCreacion || null;

    const formatearFecha = (fecha) => {
        if (!fecha) return '—';

        const date = new Date(fecha);
        if (isNaN(date)) return '—';

        return date.toLocaleDateString('es-DO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    /* ===============================
       FILTRO, BÚSQUEDA Y ORDEN
    =============================== */
    const solicitudesFiltradas = useMemo(() => {
        let data = [...solicitudes];

        // Tabs
        data =
            activeTab === 'pendientes'
                ? data.filter((s) => [1, 5, 6].includes(s.estado))
                : data.filter((s) => [2, 3, 4].includes(s.estado));

        // Búsqueda
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(
                (s) =>
                    s.numeroSolicitud?.toLowerCase().includes(term) ||
                    s.nombre?.toLowerCase().includes(term) ||
                    getEstadoTexto(s.estado).toLowerCase().includes(term)
            );
        }

        // Orden base
        data.sort((a, b) => {
            if (activeTab === 'pendientes') {
                const prioridad =
                    getEstadoPrioridad(a.estado) - getEstadoPrioridad(b.estado);
                if (prioridad !== 0) return prioridad;
            }

            return (
                new Date(obtenerFechaVisual(a)) -
                new Date(obtenerFechaVisual(b))
            );
        });

        // Orden manual
        if (sortConfig.key) {
            data.sort((a, b) => {
                let aVal, bVal;

                switch (sortConfig.key) {
                    case 'numero':
                        aVal = a.numeroSolicitud;
                        bVal = b.numeroSolicitud;
                        break;
                    case 'solicitante':
                        aVal = a.nombre;
                        bVal = b.nombre;
                        break;
                    case 'fecha':
                        aVal = new Date(obtenerFechaVisual(a));
                        bVal = new Date(obtenerFechaVisual(b));
                        break;
                    case 'estado':
                        aVal = getEstadoTexto(a.estado);
                        bVal = getEstadoTexto(b.estado);
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [solicitudes, activeTab, searchTerm, sortConfig]);

    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction:
                prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const puedeEditar = (estado) => estado === 1 || estado === 6;

    const handleEditar = (solicitud)=> {
        navigate(`/empleado/responder/${solicitud.numeroSolicitud}`);
    };

    /* ===============================
       UI
    =============================== */
    return (
        <div className="gestor-wrapper">
            <div className="gestor-card">
                <div className="logo-container">
                    <img src={logo} alt="Registro Inmobiliario" className="logo" />
                </div>

                <h1 className="gestor-title">
                    Módulo de gestión de solicitudes de exención de pasantías
                </h1>

                {/* Tabs */}
                <div className="gestor-tabs">
                    <button
                        className={`gestor-tab ${activeTab === 'pendientes' ? 'active' : ''
                            }`}
                        onClick={() => setActiveTab('pendientes')}
                    >
                        Pendientes
                    </button>
                    <button
                        className={`gestor-tab ${activeTab === 'completadas' ? 'active' : ''
                            }`}
                        onClick={() => setActiveTab('completadas')}
                    >
                        Completadas
                    </button>
                </div>

                {loading ? (
                    <div className="gestor-loading">Cargando solicitudes...</div>
                ) : (
                    <div className="gestor-table-wrapper">
                        <table className="gestor-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('numero')}>Numero</th>
                                    <th onClick={() => handleSort('solicitante')}>
                                        Solicitante
                                    </th>
                                    <th onClick={() => handleSort('fecha')}>Fecha</th>
                                    <th onClick={() => handleSort('estado')}>Estado</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {solicitudesFiltradas.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="gestor-empty">
                                            No hay solicitudes
                                        </td>
                                    </tr>
                                ) : (
                                    solicitudesFiltradas.map((s) => (
                                        <tr key={s.id}>
                                            <td>{s.numeroSolicitud}</td>
                                            <td>{s.nombre}</td>
                                            <td>{formatearFecha(obtenerFechaVisual(s))}</td>
                                            <td>{getEstadoTexto(s.estado)}</td>
                                            <td>
                                                {puedeEditar(s.estado) ? (
                                                    <button
                                                        className="btn-action"
                                                        onClick={() => handleEditar(s)}
                                                    >
                                                        ✏️
                                                    </button>
                                                ) : (
                                                    <span className="action-disabled">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GestorSolicitudes;
