using ProyectoPasantiaRI.Server.Models;
namespace ProyectoPasantiaRI.Server.Services
{
    public class SolicitudEmailService
    {
        private readonly EmailService _emailService;

        // CONSTANTE: Plantilla HTML para correo de solicitud creada
        private const string TEMPLATE_SOLICITUD_CREADA = @"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='UTF-8'>
                    <style>
                        body {{
                            font-family: Arial, sans-serif;
                            background-color: #ffffff;
                            color: #333;
                            margin: 0;
                            padding: 0;
                        }}
                        .container {{
                            max-width: 600px;
                            margin: 40px auto;
                            padding: 40px 20px;
                            text-align: center;
                        }}
                        .logo {{
                            margin-bottom: 40px;
                        }}
                        .logo img {{
                            width: 280px;
                            height: auto;
                        }}
                        .message {{
                            font-size: 15px;
                            line-height: 1.6;
                            color: #333;
                            margin: 30px 0;
                        }}
                        .solicitud-number {{
                            font-size: 15px;
                            color: #333;
                            margin: 25px 0;
                        }}
                        .solicitud-number strong {{
                            font-weight: bold;
                        }}
                        .footer {{
                            font-size: 12px;
                            color: #666;
                            margin-top: 50px;
                            font-style: italic;
                        }}
                        .footer p {{
                            margin: 5px 0;
                        }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='logo'>
                            <img src='https://i.imgur.com/YourLogoHere.png' alt='Registro Inmobiliario' />
                        </div>

                        <p class='message'>
                            La solicitud de Certificación de Exención de Pasantía ha sido creada exitosamente.
                        </p>

                        <p class='solicitud-number'>
                            Número de Solicitud: <strong>[{0}]</strong>
                        </p>

                        <p class='message'>
                            Recibirás una notificación por correo electrónico tan pronto el estado sea actualizado.
                        </p>

                        <div class='footer'>
                            <p>Favor no responder este correo.</p>
                            <p>El Registro Inmobiliario se reserva todos los derechos (©) 2025.</p>
                        </div>
                    </div>
                </body>
                </html>";

        // CONSTANTE: Plantilla HTML para correo de estado actualizado
        private const string TEMPLATE_ESTADO_ACTUALIZADO = @"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='UTF-8'>
                    <style>
                        body {{
                            font-family: Arial, sans-serif;
                            background-color: #ffffff;
                            color: #333;
                            margin: 0;
                            padding: 0;
                        }}
                        .container {{
                            max-width: 600px;
                            margin: 40px auto;
                            padding: 40px 20px;
                            text-align: center;
                        }}
                        .logo {{
                            margin-bottom: 40px;
                        }}
                        .logo img {{
                            width: 280px;
                            height: auto;
                        }}
                        .message {{
                            font-size: 15px;
                            line-height: 1.6;
                            color: #333;
                            margin: 30px 0;
                        }}
                        .estado {{
                            font-size: 18px;
                            color: #2563eb;
                            font-weight: bold;
                            margin: 25px 0;
                            padding: 15px;
                            background-color: #eff6ff;
                            border-radius: 8px;
                        }}
                        .solicitud-number {{
                            font-size: 15px;
                            color: #333;
                            margin: 25px 0;
                        }}
                        .solicitud-number strong {{
                            font-weight: bold;
                        }}
                        .footer {{
                            font-size: 12px;
                            color: #666;
                            margin-top: 50px;
                            font-style: italic;
                        }}
                        .footer p {{
                            margin: 5px 0;
                        }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='logo'>
                            <img src='https://i.imgur.com/YourLogoHere.png' alt='Registro Inmobiliario' />
                        </div>

                        <p class='message'>
                            El estado de tu solicitud ha sido actualizado.
                        </p>

                        <p class='solicitud-number'>
                            Número de Solicitud: <strong>[{0}]</strong>
                        </p>

                        <div class='estado'>
                            Nuevo Estado: {1}
                        </div>

                        <div class='footer'>
                            <p>Favor no responder este correo.</p>
                            <p>El Registro Inmobiliario se reserva todos los derechos (©) 2025.</p>
                        </div>
                    </div>
                </body>
                </html>";

        public SolicitudEmailService(EmailService emailService)
        {
            _emailService = emailService;
        }

        /// <summary>
        /// Envía correo de confirmación cuando se crea una solicitud (ASÍNCRONO)
        /// </summary>
        public async Task EnviarCorreoSolicitudCreadaAsync(Solicitud solicitud)
        {
            var cuerpoCorreo = string.Format(TEMPLATE_SOLICITUD_CREADA, solicitud.NumeroSolicitud);

            try
            {
                await _emailService.EnviarCorreoAsync(
                    solicitud.Correo,
                    "Solicitud creada exitosamente",
                    cuerpoCorreo
                );
            }
            catch (Exception ex)
            {
                throw; // Re-lanzar para que el controlador pueda manejarlo
            }
        }

        /// <summary>
        /// Envía correo cuando se actualiza el estado de una solicitud (ASÍNCRONO)
        /// </summary>
        public async Task EnviarCorreoEstadoActualizadoAsync(Solicitud solicitud, string nuevoEstado)
        {
            var cuerpoCorreo = string.Format(
                TEMPLATE_ESTADO_ACTUALIZADO,
                solicitud.NumeroSolicitud,
                ObtenerNombreEstadoAmigable(nuevoEstado)
            );

            try
            {
                await _emailService.EnviarCorreoAsync(
                    solicitud.Correo,
                    $"Actualización de solicitud #{solicitud.NumeroSolicitud}",
                    cuerpoCorreo
                );
                Console.WriteLine($"✅ Correo de actualización enviado a: {solicitud.Correo}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error enviando correo de estado actualizado: {ex.Message}");
                Console.WriteLine($"Stack Trace: {ex.StackTrace}");
                throw;
            }
        }

        /// <summary>
        /// Convierte el nombre del estado a un formato amigable para el usuario
        /// </summary>
        private string ObtenerNombreEstadoAmigable(string estado)
        {
            return estado switch
            {
                "Pendiente" => "Pendiente",
                "EnProceso" => "En Proceso",
                "Aprobada" => "Aprobada",
                "Rechazada" => "Rechazada",
                _ => estado
            };
        }
    }
}