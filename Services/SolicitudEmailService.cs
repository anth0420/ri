using ProyectoPasantiaRI.Server.Models;
namespace ProyectoPasantiaRI.Server.Services
{
    public class SolicitudEmailService
    {
        private readonly EmailService _emailService;
        private readonly IConfiguration _config;

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
                            La correcion de la solicitud de Certificacion de Extension de Pasantia Numero <strong>{0}</strong> 
                            ha sido enviada exitosamente.
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

        // ✅ NUEVA: Plantilla HTML para correo de devolución
        private const string TEMPLATE_DEVOLUCION = @"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='UTF-8'>
                    <style>
                        body {{
                            font-family: Arial, sans-serif;
                            background-color: #f5f5f5;
                            color: #333;
                            margin: 0;
                            padding: 20px;
                        }}
                        .container {{
                            max-width: 600px;
                            margin: 0 auto;
                            background-color: #ffffff;
                            padding: 40px;
                            border-radius: 8px;
                        }}
                        .logo {{
                            text-align: center;
                            margin-bottom: 30px;
                        }}
                        .logo img {{
                            width: 280px;
                            height: auto;
                        }}
                        .intro {{
                            font-size: 15px;
                            line-height: 1.6;
                            color: #333;
                            margin-bottom: 20px;
                        }}
                        .solicitud-number {{
                            font-size: 15px;
                            color: #333;
                            margin: 20px 0;
                        }}
                        .comment-section {{
                            background-color: #f9fafb;
                            border-left: 4px solid #2563eb;
                            padding: 20px;
                            margin: 25px 0;
                            border-radius: 4px;
                        }}
                        .comment-label {{
                            font-size: 13px;
                            color: #666;
                            font-style: italic;
                            margin-bottom: 10px;
                        }}
                        .comment-text {{
                            font-size: 15px;
                            color: #333;
                            line-height: 1.6;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }}
                        .instruction {{
                            font-size: 15px;
                            line-height: 1.6;
                            color: #333;
                            margin: 25px 0;
                        }}
                        .button-container {{
                            text-align: center;
                            margin: 30px 0;
                        }}
                        .button {{
                            display: inline-block;
                            background-color: #2563eb;
                            color: #ffffff;
                            padding: 14px 32px;
                            text-decoration: none;
                            border-radius: 6px;
                            font-size: 15px;
                            font-weight: 500;
                            transition: background-color 0.3s;
                        }}
                        .button:hover {{
                            background-color: #1d4ed8;
                        }}
                        .footer {{
                            font-size: 12px;
                            color: #666;
                            margin-top: 40px;
                            font-style: italic;
                            text-align: center;
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

                        <p class='intro'>
                            La solicitud de Certificación de Exención de Pasantía número <strong>[{0}]</strong>, 
                            presenta las siguientes observaciones que deben ser subsanadas:
                        </p>

                        <div class='comment-section'>
                            <div class='comment-label'>comentario de devolución de la DNMC</div>
                            <div class='comment-text'>{1}</div>
                        </div>

                        <p class='instruction'>
                            Favor realizar las correcciones indicadas para continuar con el proceso de certificación.
                        </p>

                        <div class='button-container'>
                            <a href='{2}' class='button'>Realizar correcciones</a>
                        </div>

                        <div class='footer'>
                            <p>Favor no responder este correo.</p>
                            <p>El Registro Inmobiliario se reserva todos los derechos (©) 2025.</p>
                        </div>
                    </div>
                </body>
                </html>";

        public SolicitudEmailService(EmailService emailService, IConfiguration config)
        {
            _emailService = emailService;
            _config = config;
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
        /// ✅ NUEVO: Envía correo de devolución cuando la DNMC requiere correcciones
        /// </summary>
        public async Task EnviarCorreoDevolucionAsync(Solicitud solicitud, string comentario)
        {
            // Obtener la URL base del frontend desde configuración
            var frontendUrl = _config["FrontendUrl"] ?? "http://localhost:5173";
            
            // ✅ URL con el número de solicitud como parámetro para prellenar el formulario
            var urlConsulta = $"{frontendUrl}/verificar-estatus/";

            var cuerpoCorreo = string.Format(
                TEMPLATE_DEVOLUCION,
                solicitud.NumeroSolicitud,
                comentario,
                urlConsulta
            );

            try
            {
                await _emailService.EnviarCorreoAsync(
                    solicitud.Correo,
                    "Solicitud de Corrección de Solicitud de Exención de Pasantía",
                    cuerpoCorreo
                );
                Console.WriteLine($"✅ Correo de devolución enviado a: {solicitud.Correo}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error enviando correo de devolución: {ex.Message}");
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
                "Nueva" => "Nueva",
                "EnRevision" => "En Revisión",
                "Aprobada" => "Aprobada",
                "Rechazada" => "Rechazada",
                "PendienteRespuesta" => "Pendiente de respuesta",
                "RespuestaUsuario" => "Respuesta de usuario",
                _ => estado
            };
        }
    }
}