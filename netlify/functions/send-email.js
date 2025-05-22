const nodemailer = require('nodemailer');
const Busboy = require('busboy').Busboy;

exports.handler = async function(event) {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod !== 'POST') {
    console.log('Método no permitido:', event.httpMethod);
    return {
      statusCode: 405,
      body: 'Método no permitido',
    };
  }

  console.log('Iniciando procesamiento de formulario...');

  return new Promise((resolve, reject) => {
    const busboy = new Busboy({ headers: event.headers });
    const fields = {};
    const files = [];

    busboy.on('field', (fieldname, val) => {
      console.log(`Campo recibido: ${fieldname} = ${val}`);
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(`Archivo recibido: ${filename} (${mimetype})`);
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
        console.log(`Archivo procesado: ${filename}`);
      });
    });

    busboy.on('finish', async () => {
      console.log('Campos:', fields);
      console.log('Archivos adjuntos:', files.map(f => f.filename));

      try {
        let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        console.log('Transporter creado');

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

        console.log('Enviando correo...');
        await transporter.sendMail(mailOptions);
        console.log('Correo enviado correctamente');

        resolve({
          statusCode: 200,
          body: JSON.stringify({ message: 'Formulario enviado exitosamente' }),
        });
      } catch (error) {
        console.error('Error al enviar correo:', error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: error.message || 'Error enviando correo' }),
        });
      }
    });

    busboy.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
  });
};
