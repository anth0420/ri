using System.Net;
using System.Net.Mail;

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
        /// Envía correo de manera verdaderamente asíncrona sin bloquear
        /// </summary>
        public async Task EnviarCorreoAsync(string para, string asunto, string cuerpoHtml)
        {
            // Ejecutar en un hilo separado para evitar bloqueo
            await Task.Run(async () =>
            {
                try
                {
                    // Validaciones básicas
                    var from = _config["MailSettings:MailFrom"];
                    if (string.IsNullOrWhiteSpace(from))
                        throw new Exception("MailFrom no está configurado en appsettings.json");

                    var host = _config["MailSettings:MailServer"];
                    if (string.IsNullOrWhiteSpace(host))
                        throw new Exception("MailServer no está configurado en appsettings.json");

                    // Validar y limpiar correo destinatario
                    if (string.IsNullOrWhiteSpace(para))
                        throw new ArgumentException("El correo del destinatario no puede estar vacío");

                    para = para.Trim();
                    if (!System.Text.RegularExpressions.Regex.IsMatch(para, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                        throw new ArgumentException($"El correo '{para}' no tiene un formato válido");

                    using var mailMessage = new MailMessage
                    {
                        From = new MailAddress(from),
                        Subject = asunto,
                        Body = cuerpoHtml,
                        IsBodyHtml = true
                    };
                    mailMessage.To.Add(new MailAddress(para));

                    using var smtp = new SmtpClient
                    {
                        Host = host,
                        Port = int.Parse(_config["MailSettings:MailPort"]),
                        EnableSsl = false,
                        DeliveryMethod = SmtpDeliveryMethod.Network,
                        UseDefaultCredentials = false,
                        Credentials = new NetworkCredential(
                            from,
                            _config["MailSettings:MailPassword"],
                            "suprema-ji"
                        ),
                        Timeout = 10000 // 20 segundos timeout
                    };

                    // Envío asíncrono real
                    await smtp.SendMailAsync(mailMessage);
                }
                catch (Exception ex)
                {
                    // Re-lanzar para que EmailBackgroundService lo capture
                    throw new Exception($"Error al enviar correo: {ex.Message}", ex);
                }
            }).ConfigureAwait(false); // ConfigureAwait(false) evita capturar el contexto
        }
    }
}