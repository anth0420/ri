using Microsoft.EntityFrameworkCore;
using ProyectoPasantiaRI.Server.Models;

namespace ProyectoPasantiaRI.Server.Data
{
    public class LogsDbContext : DbContext
    {
        public LogsDbContext(DbContextOptions<LogsDbContext> options)
            : base(options) { }
        public DbSet<Persona> Personas { get; set; }
    }
}
