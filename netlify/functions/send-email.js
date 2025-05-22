const nodemailer = require('nodemailer');
const Busboy = require('busboy');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Método no permitido',
    };
  }

  return new Promise((resolve, reject) => {
    const busboy = new Busboy({ headers: event.headers });
    const fields = {};
    const files = [];

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      let buffers = [];
      file.on('data', (data) => {
        buffers.push(data);
      });
      file.on('end', () => {
        files.push({
          filename,
          content: Buffer.concat(buffers),
          contentType: mimetype,
        });
      });
    });

    busboy.on('finish', async () => {
      try {
        let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        let mailOptions = {
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
        console.error(error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: 'Error enviando correo' }),
        });
      }
    });

    busboy.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
  });
};
