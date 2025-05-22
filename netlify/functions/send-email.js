const nodemailer = require('nodemailer');
// ✅ Corrección: Importar busboy correctamente
const busboy = require('busboy');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Método no permitido',
    };
  }

  return new Promise((resolve, reject) => {
    // ✅ Corrección: Usar busboy() en lugar de new Busboy()
    const bb = busboy({ headers: event.headers });
    const fields = {};
    const files = [];

    bb.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    bb.on('file', (fieldname, file, info) => {
      // ✅ Corrección: En versiones nuevas, el objeto info contiene filename y mimeType
      const { filename, mimeType } = info;
      const buffers = [];
      
      file.on('data', (data) => buffers.push(data));
      file.on('end', () => {
        files.push({
          filename,
          content: Buffer.concat(buffers),
          contentType: mimeType,
        });
      });
    });

    bb.on('finish', async () => {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const mailOptions = {
          from: `"Formulario Empleo" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          subject: 'Nuevo Registro de Empleo',
          html: `
            <p><strong>Nombre:</strong> ${fields.name}</p>
            <p><strong>Teléfono:</strong> ${fields.phone}</p>
            <p><strong>Correo:</strong> ${fields.email}</p>
            <p><strong>Formación Profesional:</strong> ${fields.education}</p>
            <p><strong>Habilidades:</strong> ${fields.skills}</p>
          `,
          attachments: files,
        };

        await transporter.sendMail(mailOptions);

        resolve({
          statusCode: 200,
          body: JSON.stringify({ message: 'Formulario enviado exitosamente' }),
        });
      } catch (error) {
        console.error('Error enviando email:', error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: error.message }),
        });
      }
    });

    bb.on('error', (err) => {
      console.error('Error en busboy:', err);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Error procesando el formulario' }),
      });
    });

    // ✅ Corrección: Procesar el body correctamente
    bb.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
  });
};