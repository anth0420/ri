namespace ProyectoPasantiaRI.Server.DTOs
{
    public class CertificacionResponseDto
    {
        public int Id { get; set; }
        public string NombreArchivo { get; set; }
        public DateTime FechaEnvio { get; set; }
        public string TipoArchivo { get; set; }
        public long TamanoBytes { get; set; }
    }

    public class SolicitudConCertificacionesDto
    {
        public int Id { get; set; }
        public string NumeroSolicitud { get; set; }
        public string Nombre { get; set; }
        public string Correo { get; set; }
        public int Estado { get; set; }
        public DateTime FechaCreacion { get; set; }
        public DateTime? FechaDevolucion { get; set; }
        public List<CertificacionResponseDto> Certificaciones { get; set; } = new();
    }
}