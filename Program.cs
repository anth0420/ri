using Microsoft.EntityFrameworkCore;
using ProyectoPasantiaRI.Server.Data;
using ProyectoPasantiaRI.Server.Services;
using System.Threading.Channels;



var builder = WebApplication.CreateBuilder(args);

// =====================
// SERVICIOS
// =====================

// Controllers
builder.Services.AddControllers();

// Entity Framework Core
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<LogsDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("LogsConnection")));
// Servicios personalizados

builder.Services.AddScoped<SolicitudService>();
builder.Services.AddScoped<SolicitudEmailService>();

// CORS (React)
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});


builder.Services.AddScoped<EmailService>();



// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// CORS SIEMPRE antes de UseAuthorization
app.UseCors("ReactPolicy");  // <-- CAMBIO AQU�: usa el mismo nombre que definiste arriba

app.UseAuthorization();

// Controllers
app.MapControllers();

app.Run();