import React, { useState, useEffect, useMemo, useCallback } from 'react';
import logo from '../../assets/logo.png';
import '../../styles/GestorSolicitudes.css';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

// ==================== CONSTANTES ====================

const CONSTANTS = {
    ITEMS_PER_PAGE: 15,
    PAGES_PER_BLOCK: 10,
    POLLING_INTERVAL: 15000, // 15 segundos
};

const ESTADOS = {
    1: 'Nueva',
    2: 'En revisión',
    3: 'Completada',
    4: 'Rechazada',
    5: 'Espera respuesta usuario',
    6: 'Respuesta de usuario',
};

const PRIORIDADES = {
    6: 1,
    1: 2,
    5: 3,
};

const EXTENSIONES_PERMITIDAS = ['.pdf', '.jpg', '.jpeg', '.png'];
const TAMAÑO_MAXIMO_ARCHIVO = 5 * 1024 * 1024; // 5MB

// ==================== COMPONENTE PRINCIPAL ====================

const GestorSolicitudes = ({ rol }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const userRol = rol || user?.rol;

    // ==================== ESTADO ====================

    const [activeTab, setActiveTab] = useState('pendientes');
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [certificacionesMap, setCertificacionesMap] = useState({});

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [motivo, setMotivo] = useState('');
    const [archivos, setArchivos] = useState([]);
    const [uploading, setUploading] = useState(false);

    // ==================== FUNCIONES DE UTILIDAD ====================

    const getEstadoTexto = useCallback((estado) => ESTADOS[estado] || 'Desconocido', []);

    const getEstadoPrioridad = useCallback((estado) => PRIORIDADES[estado] || 99, []);

    const formatearFechaCorta = useCallback((fecha) => {
        if (!fecha) return '—';
        const date = new Date(fecha);
        if (isNaN(date)) return '—';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    }, []);

    // ==================== FUNCIONES DE API ====================

    const fetchSolicitudes = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await fetch(`${API_URL}/api/Solicitudes`);
            if (!response.ok) throw new Error('Error al cargar solicitudes');
            const data = await response.json();
            setSolicitudes(data);
        } catch (error) {
            console.error('Error fetching solicitudes:', error);
            if (!silent) alert('Error al cargar las solicitudes');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCertificaciones = useCallback(async (numeroSolicitud) => {
        try {
            const response = await fetch(
                `${API_URL}/api/Solicitudes/${numeroSolicitud}/certificaciones`
            );
            if (!response.ok) return;
            const data = await response.json();
            setCertificacionesMap(prev => ({
                ...prev,
                [numeroSolicitud]: data
            }));
        } catch (error) {
            console.error('Error fetching certificaciones:', error);
        }
    }, []);

    const actualizarCertificado = useCallback(async (numeroSolicitud, formData) => {
        try {
            const response = await fetch(
                `${API_URL}/api/Solicitudes/${numeroSolicitud}/actualizar-certificado-con-motivo`,
                { method: 'POST', body: formData }
            );
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al actualizar el certificado');
            }
            return true;
        } catch (error) {
            console.error('Error actualizando certificado:', error);
            throw error;
        }
    }, []);

    // ==================== EFECTOS ====================

    // Carga inicial
    useEffect(() => {
        fetchSolicitudes();
    }, [fetchSolicitudes]);

    // Cargar certificaciones cuando cambia la pestaña
    useEffect(() => {
        if (activeTab === 'completadas') {
            solicitudes
                .filter(s => s.estado === 3)
                .forEach(s => {
                    if (!certificacionesMap[s.numeroSolicitud]) {
                        fetchCertificaciones(s.numeroSolicitud);
                    }
                });
        }
    }, [activeTab, solicitudes, certificacionesMap, fetchCertificaciones]);

    // Polling automático
    useEffect(() => {
        const interval = setInterval(() => {
            fetchSolicitudes(true);
        }, CONSTANTS.POLLING_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchSolicitudes]);

    // ==================== FUNCIONES DE FILTRADO Y ORDENAMIENTO ====================

    const solicitudesFiltradas = useMemo(() => {
        let data = [...solicitudes];

        // Filtrar por pestaña
        data = activeTab === 'pendientes'
            ? data.filter(s => [1, 5, 6].includes(s.estado))
            : data.filter(s => s.estado === 3);

        // Filtrar por búsqueda
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(s =>
                s.numeroSolicitud?.toLowerCase().includes(term) ||
                s.nombre?.toLowerCase().includes(term) ||
                (activeTab === 'pendientes' && s.cedula?.toLowerCase().includes(term)) ||
                (activeTab === 'pendientes' && getEstadoTexto(s.estado).toLowerCase().includes(term))
            );
        }

        // Ordenamiento personalizado
        if (!sortConfig.key) {
            if (activeTab === 'pendientes') {
                data.sort((a, b) => {
                    const prioridad = getEstadoPrioridad(a.estado) - getEstadoPrioridad(b.estado);
                    if (prioridad !== 0) return prioridad;
                    return new Date(a.fechaCreacion) - new Date(b.fechaCreacion);
                });
            } else {
                data.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
            }
        }

        // Ordenamiento por columna
        if (sortConfig.key) {
            data.sort((a, b) => {
                let aVal, bVal;
                switch (sortConfig.key) {
                    case 'numero':
                        aVal = a.numeroSolicitud?.toLowerCase() || '';
                        bVal = b.numeroSolicitud?.toLowerCase() || '';
                        break;
                    case 'solicitante':
                        aVal = a.nombre?.toLowerCase() || '';
                        bVal = b.nombre?.toLowerCase() || '';
                        break;
                    case 'fechaSolicitud':
                        aVal = new Date(a.fechaCreacion);
                        bVal = new Date(b.fechaCreacion);
                        break;
                    case 'fechaCertificacion':
                        aVal = new Date(a.fechaDevolucion || 0);
                        bVal = new Date(b.fechaDevolucion || 0);
                        break;
                    case 'estado':
                        aVal = getEstadoTexto(a.estado).toLowerCase();
                        bVal = getEstadoTexto(b.estado).toLowerCase();
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
    }, [solicitudes, activeTab, searchTerm, sortConfig, getEstadoTexto, getEstadoPrioridad]);

    // ==================== FUNCIONES DE PAGINACIÓN ====================

    const totalPages = Math.ceil(solicitudesFiltradas.length / CONSTANTS.ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * CONSTANTS.ITEMS_PER_PAGE;
    const endIndex = startIndex + CONSTANTS.ITEMS_PER_PAGE;
    const solicitudesPaginadas = solicitudesFiltradas.slice(startIndex, endIndex);

    const currentBlock = Math.floor((currentPage - 1) / CONSTANTS.PAGES_PER_BLOCK);
    const startPage = currentBlock * CONSTANTS.PAGES_PER_BLOCK + 1;
    const endPage = Math.min(startPage + CONSTANTS.PAGES_PER_BLOCK - 1, totalPages);
    const visiblePages = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab, sortConfig]);

    // ==================== FUNCIONES DE MODAL ====================

    const handleOpenModal = useCallback((solicitud) => {
        setSelectedSolicitud(solicitud);
        setMotivo('');
        setArchivos([]);
        setShowModal(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setSelectedSolicitud(null);
        setMotivo('');
        setArchivos([]);
    }, []);

    const handleFileChange = useCallback((e) => {
        const files = Array.from(e.target.files);

        for (let file of files) {
            const extension = '.' + file.name.split('.').pop().toLowerCase();

            if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
                alert(`El archivo ${file.name} tiene un formato no permitido. Solo se aceptan: PDF, JPG, JPEG, PNG`);
                return;
            }

            if (file.size > TAMAÑO_MAXIMO_ARCHIVO) {
                alert(`El archivo ${file.name} excede el tamaño máximo de 5MB`);
                return;
            }
        }

        setArchivos(files);
    }, []);

    const handleSubmitActualizacion = useCallback(async (e) => {
        e.preventDefault();

        // Validaciones
        if (!motivo.trim()) {
            alert('El motivo de actualización es obligatorio');
            return;
        }

        if (motivo.length < 10) {
            alert('El motivo debe tener al menos 10 caracteres');
            return;
        }

        if (motivo.length > 250) {
            alert('El motivo no puede exceder 250 caracteres');
            return;
        }

        if (archivos.length === 0) {
            alert('Debe cargar al menos un certificado actualizado');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('Motivo', motivo);
            archivos.forEach(archivo => formData.append('Archivos', archivo));

            await actualizarCertificado(selectedSolicitud.numeroSolicitud, formData);

            alert('Certificado actualizado correctamente');
            handleCloseModal();

            // Recargar datos
            await fetchSolicitudes(true);
            await fetchCertificaciones(selectedSolicitud.numeroSolicitud);
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error al actualizar el certificado');
        } finally {
            setUploading(false);
        }
    }, [motivo, archivos, selectedSolicitud, handleCloseModal, actualizarCertificado, fetchSolicitudes, fetchCertificaciones]);

    // ==================== MANEJADORES DE ACCIONES ====================

    const handleSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    const handlePageChange = useCallback((pageNumber) => {
        setCurrentPage(pageNumber);
    }, []);

    const handleEditar = useCallback((solicitud) => {
        const basePath = userRol === "admin" ? "/admin" : "/empleado";
        navigate(`${basePath}/responder/${solicitud.numeroSolicitud}`, {
            state: { from: userRol }
        });
    }, [userRol, navigate]);

    const descargarCertificado = useCallback((cert) => {
        window.open(
            `${API_URL}/api/Solicitudes/certificacion/${cert.id}`,
            "_blank",
            "noopener,noreferrer"
        );
    }, []);

    // ==================== FUNCIONES AUXILIARES DE UI ====================

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <span className="sort-icon inactive">↕</span>;
        }
        return sortConfig.direction === 'asc' ?
            <span className="sort-icon active">↑</span> :
            <span className="sort-icon active">↓</span>;
    };

    const puedeEditar = (estado) => estado === 1 || estado === 6;

    // ==================== RENDER - TABLA PENDIENTES ====================

    const renderTablaPendientes = () => (
        <table className="gestor-table">
            <thead>
                <tr>
                    <th onClick={() => handleSort('numero')}>
                        Número {getSortIcon('numero')}
                    </th>
                    <th onClick={() => handleSort('solicitante')}>
                        Solicitante {getSortIcon('solicitante')}
                    </th>
                    <th onClick={() => handleSort('fechaSolicitud')}>
                        Fecha de solicitud {getSortIcon('fechaSolicitud')}
                    </th>
                    <th onClick={() => handleSort('estado')}>
                        Estado {getSortIcon('estado')}
                    </th>
                    <th className="no-sort">Acción</th>
                </tr>
            </thead>
            <tbody>
                {solicitudesPaginadas.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="gestor-empty">
                            {searchTerm
                                ? 'No se encontraron resultados para tu búsqueda'
                                : 'No hay solicitudes pendientes'}
                        </td>
                    </tr>
                ) : (
                    solicitudesPaginadas.map((s, index) => (
                        <tr key={s.id} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                            <td>{s.numeroSolicitud}</td>
                            <td>{s.nombre}</td>
                            <td>{formatearFechaCorta(s.fechaCreacion)}</td>
                            <td>{getEstadoTexto(s.estado)}</td>
                            <td className="action-cell">
                                {puedeEditar(s.estado) ? (
                                    <button
                                        type="button"
                                        className="btn-action"
                                        onClick={() => handleEditar(s)}
                                        title="Responder solicitud"
                                    >
                                        <i className="bi bi-pencil"></i>
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
    );

    // ==================== RENDER - TABLA COMPLETADAS ====================

    const renderTablaCompletadas = () => (
        <table className="gestor-table">
            <thead>
                <tr>
                    <th onClick={() => handleSort('numero')}>
                        Número {getSortIcon('numero')}
                    </th>
                    <th onClick={() => handleSort('solicitante')}>
                        Solicitante {getSortIcon('solicitante')}
                    </th>
                    <th onClick={() => handleSort('fechaSolicitud')}>
                        Fecha de solicitud {getSortIcon('fechaSolicitud')}
                    </th>
                    <th onClick={() => handleSort('fechaCertificacion')}>
                        Fecha de certificación {getSortIcon('fechaCertificacion')}
                    </th>
                    <th className="no-sort">Certificaciones</th>
                </tr>
            </thead>
            <tbody>
                {solicitudesPaginadas.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="gestor-empty">
                            {searchTerm
                                ? 'No se encontraron resultados para tu búsqueda'
                                : 'No hay solicitudes completadas'}
                        </td>
                    </tr>
                ) : (
                    solicitudesPaginadas.map((s, index) => (
                        <tr key={s.id} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                            <td>{s.numeroSolicitud}</td>
                            <td>{s.nombre}</td>
                            <td>{formatearFechaCorta(s.fechaCreacion)}</td>
                            <td>{formatearFechaCorta(s.fechaDevolucion)}</td>
                            <td className="action-cell">
                                <button
                                    className="btn-download"
                                    onClick={() => handleOpenModal(s)}
                                    title="Actualizar certificado"
                                >
                                    <i className="bi bi-gear"></i>
                                </button>
                                {certificacionesMap[s.numeroSolicitud]?.length >= 1 ? (
                                    <button
                                        className="btn-download"
                                        onClick={() => descargarCertificado(certificacionesMap[s.numeroSolicitud][0])}
                                        title={certificacionesMap[s.numeroSolicitud][0]?.nombreArchivo || 'Descargar certificado'}
                                    >
                                        <i className="bi bi-download"></i>
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
    );

    // ==================== RENDER - PAGINACIÓN ====================

    const renderPaginacion = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="gestor-pagination">
                {currentBlock > 0 && (
                    <button
                        className="page-nav"
                        onClick={() => handlePageChange(startPage - 1)}
                        title="Página anterior"
                    >
                        «
                    </button>
                )}
                {visiblePages.map(pageNum => (
                    <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                    >
                        {pageNum}
                    </button>
                ))}
                {endPage < totalPages && (
                    <button
                        className="page-nav"
                        onClick={() => handlePageChange(endPage + 1)}
                        title="Página siguiente"
                    >
                        »
                    </button>
                )}
            </div>
        );
    };

    // ==================== RENDER - MODAL ====================

    const renderModal = () => {
        if (!showModal || !selectedSolicitud) return null;

        return (
            <div className="modal-overlay" onClick={handleCloseModal}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Actualizar Certificado</h2>
                        <button className="modal-close" onClick={handleCloseModal}>×</button>
                    </div>

                    <form onSubmit={handleSubmitActualizacion}>
                        <div className="modal-body">
                            <p><strong>Solicitud:</strong> {selectedSolicitud.numeroSolicitud}</p>
                            <p><strong>Solicitante:</strong> {selectedSolicitud.nombre}</p>

                            <div className="form-group">
                                <label htmlFor="motivo">Motivo de actualización *</label>
                                <textarea
                                    id="motivo"
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    placeholder="Explique el motivo de la actualización (10-250 caracteres)"
                                    rows="4"
                                    maxLength="250"
                                    required
                                />
                                <small>{motivo.length}/250 caracteres</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="archivos">Nuevo(s) certificado(s) *</label>
                                <input
                                    type="file"
                                    id="archivos"
                                    onChange={handleFileChange}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    multiple
                                    required
                                />
                                <small>Formatos permitidos: PDF, JPG, JPEG, PNG (máx. 5MB cada uno)</small>
                                {archivos.length > 0 && (
                                    <div className="files-list">
                                        <p><strong>Archivos seleccionados:</strong></p>
                                        <ul>
                                            {Array.from(archivos).map((file, index) => (
                                                <li key={index}>{file.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleCloseModal}
                                disabled={uploading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={uploading}
                            >
                                {uploading ? 'Enviando...' : 'Actualizar Certificado'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // ==================== RENDER PRINCIPAL ====================

    return (
        <div className="gestor-wrapper">
            <div className="gestor-card">
                {/* Header */}
                <div className="gestor-header">
                    <img src={logo} alt="Registro Inmobiliario" className="gestor-logo" />
                </div>

                <h1 className="gestor-title">
                    Módulo de gestión de solicitudes de exención de pasantías
                </h1>

                {/* Tabs */}
                <div className="gestor-tabs">
                    <button
                        className={`gestor-tab ${activeTab === 'pendientes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pendientes')}
                    >
                        Pendientes
                    </button>
                    <button
                        className={`gestor-tab ${activeTab === 'completadas' ? 'active' : ''}`}
                        onClick={() => setActiveTab('completadas')}
                    >
                        Completadas
                    </button>
                </div>

                {/* Search */}
                <div className="gestor-search">
                    <input
                        type="text"
                        placeholder={
                            activeTab === 'pendientes'
                                ? "Buscar por número, solicitante o estado..."
                                : "Buscar por número o solicitante..."
                        }
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    {searchTerm && (
                        <button
                            className="clear-search"
                            onClick={() => setSearchTerm('')}
                            title="Limpiar búsqueda"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="gestor-loading">Cargando solicitudes...</div>
                ) : (
                    <>
                        <div className="gestor-table-wrapper">
                            {activeTab === 'pendientes'
                                ? renderTablaPendientes()
                                : renderTablaCompletadas()}
                        </div>

                        {renderPaginacion()}

                        {solicitudesFiltradas.length > 0 && (
                            <div className="pagination-info">
                                Mostrando {startIndex + 1} - {Math.min(endIndex, solicitudesFiltradas.length)} de {solicitudesFiltradas.length} solicitudes
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal */}
            {renderModal()}
        </div>
    );
};

export default GestorSolicitudes;