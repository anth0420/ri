using System.ComponentModel.DataAnnotations;

namespace ProyectoPasantiaRI.Server.DTOs
{
    public class ActualizarArchivos
    {
        [Required]
        public List<IFormFile> Archivos { get; set; } = new();
    }
}
