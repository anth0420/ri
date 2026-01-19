import React, { useState } from 'react'
import ExencionPasantia from './components/ExencionPasantia.jsx'
import CrearSolicitud from './components/CrearSolicitud.jsx'

import ConsultaSolicitud from './components/ConsultarSolicitud.jsx'

function App() {
    const [route, setRoute] = useState('/')
    const handleNavigate = (path) => setRoute(path)

    return (
        <div>
            {route === '/' && <ExencionPasantia onNavigate={handleNavigate} />}
            {route === '/crear-solicitud' && (
                <CrearSolicitud onNavigation={handleNavigate} />
            )}
            {route === '/verificar-estatus' && (

                <ConsultaSolicitud onNavigation={handleNavigate} />
               
            )}
        </div>
    )
}

export default App