using Microsoft.AspNetCore.Mvc;
using ProyectoPasantiaRI.Server.DTOs;
using System.DirectoryServices.AccountManagement;
using System.Runtime.Versioning;

namespace ProyectoPasantiaRI.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ActiveDirectoryController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public ActiveDirectoryController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [HttpGet("buscar")]
        [SupportedOSPlatform("windows")]
        public IActionResult BuscarUsuario([FromQuery] string username)
        {
            if (string.IsNullOrWhiteSpace(username))
                return BadRequest("Username es requerido");

            string? domain = _configuration["ActiveDirectory:Domain"];
            if (string.IsNullOrWhiteSpace(domain))
                return StatusCode(500, "Active Directory no configurado");

            using var context = new PrincipalContext(ContextType.Domain, domain);

            var user = UserPrincipal.FindByIdentity(
                context,
                IdentityType.SamAccountName,
                username
            );

            if (user == null)
                return NotFound("Usuario no encontrado");

            return Ok(new
            {
                nombreCompleto = user.DisplayName ?? string.Empty,
                correo = user.EmailAddress ?? string.Empty
            });
        }

        [HttpPost("validate")]
        [SupportedOSPlatform("windows")]
        public IActionResult ValidateCredentials([FromBody] AuthRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest("Usuario y contraseña requeridos");

            string? domain = _configuration["ActiveDirectory:Domain"];
            if (string.IsNullOrWhiteSpace(domain))
                return StatusCode(500, "Active Directory no configurado");

            try
            {
                using var context = new PrincipalContext(ContextType.Domain, domain);

                bool isValid = context.ValidateCredentials(
                    request.Username,
                    request.Password,
                    ContextOptions.Negotiate
                );

                return Ok(new { autenticado = isValid });
            }
            catch
            {
                return StatusCode(500, "Error conectando con Active Directory");
            }
        }
    }
}
