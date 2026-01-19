using System.ComponentModel.DataAnnotations;

namespace ProyectoPasantiaRI.Server.DTOs
{
    public class SubirArchivoDto
    {
        [Required]
        public IFormFile Archivo { get; set; } = null!;


    }
}
