using System.Net;
using System.Net.Mail;
using System.Net.Mime;

namespace ProyectoPasantiaRI.Server.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        /// <summary>
        /// Envía correo simple sin adjuntos
        /// </summary>
        public async Task EnviarCorreoAsync(string destinatario, string asunto, string cuerpoHtml)
        {
            var smtpConfig = _config.GetSection("MailSettings");
            var servidor = smtpConfig["MailServer"];
            var puerto = int.Parse(smtpConfig["MailPort"]);
            var usuario = smtpConfig["MailAccount"]; // solo para autenticación
            var contrasena = smtpConfig["MailPassword"];
            var remitente = smtpConfig["MailFrom"];  // correo válido mostrado al destinatario
            var habilitarSsl = false; // Puerto 25 normalmente no usa SSL

            using var cliente = new SmtpClient(servidor, puerto)
            {
                Credentials = new NetworkCredential(usuario, contrasena),
                EnableSsl = habilitarSsl
            };

            var mensaje = new MailMessage
            {
                From = new MailAddress(remitente, "Registro Inmobiliario"), // ⚡ Aquí usamos MailFrom
                Subject = asunto,
                Body = cuerpoHtml,
                IsBodyHtml = true
            };

            mensaje.To.Add(destinatario);

            await cliente.SendMailAsync(mensaje);
        }

        /// <summary>
        /// Envía correo con archivos adjuntos
        /// </summary>
        public async Task EnviarCorreoConAdjuntosAsync(
            string destinatario,
            string asunto,
            string cuerpoHtml,
            List<string> rutasArchivos)
        {
            var smtpConfig = _config.GetSection("MailSettings");
            var servidor = smtpConfig["MailServer"];
            var puerto = int.Parse(smtpConfig["MailPort"]);
            var usuario = smtpConfig["MailAccount"]; // autenticación
            var contrasena = smtpConfig["MailPassword"];
            var remitente = smtpConfig["MailFrom"]; // correo válido
            var habilitarSsl = false; // puerto 25

            using var cliente = new SmtpClient(servidor, puerto)
            {
                Credentials = new NetworkCredential(usuario, contrasena),
                EnableSsl = habilitarSsl
            };

            var mensaje = new MailMessage
            {
                From = new MailAddress(remitente, "Registro Inmobiliario"), // ⚡ MailFrom usado
                Subject = asunto,
                Body = cuerpoHtml,
                IsBodyHtml = true
            };

            mensaje.To.Add(destinatario);

            // Adjuntar archivos
            foreach (var rutaArchivo in rutasArchivos)
            {
                if (File.Exists(rutaArchivo))
                {
                    var adjunto = new Attachment(rutaArchivo);

                    var extension = Path.GetExtension(rutaArchivo).ToLower();
                    adjunto.ContentType = extension switch
                    {
                        ".pdf" => new ContentType("application/pdf"),
                        ".jpg" or ".jpeg" => new ContentType("image/jpeg"),
                        ".png" => new ContentType("image/png"),
                        _ => new ContentType("application/octet-stream")
                    };

                    adjunto.Name = Path.GetFileName(rutaArchivo);
                    mensaje.Attachments.Add(adjunto);
                }
                else
                {
                    Console.WriteLine($"⚠️ Archivo no encontrado: {rutaArchivo}");
                }
            }

            try
            {
                await cliente.SendMailAsync(mensaje);
                Console.WriteLine($"✅ Correo enviado a {destinatario} con {mensaje.Attachments.Count} adjunto(s)");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error al enviar correo: {ex.Message}");
                throw;
            }
            finally
            {
                // Liberar recursos de los adjuntos
                foreach (var adjunto in mensaje.Attachments)
                    adjunto.Dispose();
            }
        }
    }
}
