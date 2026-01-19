namespace ProyectoPasantiaRI.Server.DTOs
{
    public class SolicitudArchivoResponseDto
    {
        public int Id { get; set; }
        public string NombreOriginal { get; set; } = null!;
        public DateTime FechaSubida { get; set; }
        public bool EsActual { get; set; }
    }
}
