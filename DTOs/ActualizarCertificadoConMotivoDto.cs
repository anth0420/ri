namespace ProyectoPasantiaRI.Server.DTOs
{
    public class ActualizarCertificadoConMotivoDto
    {
        public string Motivo { get; set; }
        public List<IFormFile> Archivos { get; set; }
    }
}
