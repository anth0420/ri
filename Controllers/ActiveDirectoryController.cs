using Microsoft.AspNetCore.Mvc;
using ProyectoPasantiaRI.Server.DTOs;
using System.DirectoryServices.AccountManagement;

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
        public IActionResult BuscarUsuario([FromQuery] string username)
        {
            if (string.IsNullOrWhiteSpace(username))
                return BadRequest("Username es requerido");

            string domain = _configuration["ActiveDirectory:Domain"];

            using var context = new PrincipalContext(
                ContextType.Domain,
                domain
            );

            var user = UserPrincipal.FindByIdentity(
                context,
                IdentityType.SamAccountName,
                username
            );

            if (user == null)
                return NotFound("Usuario no encontrado");

            return Ok(new
            {
                nombreCompleto = user.DisplayName ?? "",
                correo = user.EmailAddress ?? ""
            });
        }
        [HttpPost("validar")]
        public IActionResult ValidarUsuario([FromBody] AuthRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(false);

            string domain = _configuration["ActiveDirectory:Domain"];

            try
            {
                using var context = new PrincipalContext(
                    ContextType.Domain,
                    domain
                );

                bool esValido = context.ValidateCredentials(
                    request.Username,
                    request.Password
                );

                return Ok(esValido);
            }
            catch
            {
                return Ok(false);
            }
        }
    }
}
