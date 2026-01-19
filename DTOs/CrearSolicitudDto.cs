using ProyectoPasantiaRI.Server.Enums;
using System.ComponentModel.DataAnnotations;

namespace ProyectoPasantiaRI.Server.DTOs
{
    public class CrearSolicitudDto
    {
        [Required]
        [StringLength(11, MinimumLength = 11)]
        public string Cedula { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string Nombre { get; set; } = null!;

        [Required]
        [EmailAddress]
        public string Correo { get; set; } = null!;
   

        [Required]
        [MinLength(1, ErrorMessage = "Debe subir al menos un archivo")]
        public List<IFormFile> Archivos { get; set; } = new();
    }
}
