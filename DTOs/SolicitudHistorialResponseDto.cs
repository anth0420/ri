namespace ProyectoPasantiaRI.Server.DTOs
{
    public class SolicitudHistorialResponseDto
    {
        public DateTime FechaDevolucion { get; set; }
        public string Comentario { get; set; } = null!;

        public List<string> Archivos { get; set; } = new();
    }
}
