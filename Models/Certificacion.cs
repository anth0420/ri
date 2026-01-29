using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProyectoPasantiaRI.Server.Models
{
    public class Certificacion
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SolicitudId { get; set; }

        [ForeignKey("SolicitudId")]
        public Solicitud Solicitud { get; set; }

        [Required]
        [MaxLength(500)]
        public string NombreArchivo { get; set; }

        [Required]
        [MaxLength(500)]
        public string Ruta { get; set; }

        [Required]
        public DateTime FechaEnvio { get; set; }

        [MaxLength(100)]
        public string TipoArchivo { get; set; } // PDF, JPG, etc.

        public long TamanoBytes { get; set; }
    }
}