const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ddysqiaeojmlziesndgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeXNxaWFlb2ptbHppZXNuZGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDI1ODYsImV4cCI6MjA4OTAxODU4Nn0.gq-rRHR6Wr01L41x2nTeCK93DYLzlB9dXdS9xYWsbAg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const filePath = path.join(__dirname, 'src', 'assets', 'pdf', 'Guia_CompanyCare_v4.pdf');
  console.log('Reading file:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    return;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = `Guia_CompanyCare_v4_${Date.now()}.pdf`;

  console.log('Uploading to Supabase storage bucket resources-files...');
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('resources-files')
    .upload(fileName, fileBuffer, { contentType: 'application/pdf', upsert: true });

  let publicUrl = 'assets/pdf/Guia_CompanyCare_v4.pdf';

  if (uploadError) {
    console.warn('Storage upload error (might require auth session):', uploadError.message);
  } else {
    const { data: urlData } = supabase.storage
      .from('resources-files')
      .getPublicUrl(fileName);
    publicUrl = urlData.publicUrl;
    console.log('Successfully uploaded to Storage! Public URL:', publicUrl);
  }

  console.log('Inserting into Supabase resources table...');
  const payload = {
    title: 'Guía Oficial CompanyCare v4',
    summary: 'Manual completo de acompañamiento, orientación y recursos para colaboradores y cuidadores de adultos mayores.',
    category: 'Guías prácticas',
    resource_type: 'pdf',
    read_time_min: 15,
    is_priority: true,
    is_published: true,
    file_url: publicUrl,
    video_url: null,
    sort_order: 1,
    content: [
      {
        heading: 'Guía Integral del Cuidador CompanyCare (v4)',
        body: 'Documento completo con recomendaciones gerontológicas, evaluación de necesidades, red de apoyo y orientación para familias.',
        bullets: [
          'Estrategias de cuidado diario y prevención de sobrecarga',
          'Evaluación de autonomía y niveles de dependencia',
          'Red de convenios SeniorClub y proveedores verificados',
          'Protocolos de asesoría personalizada con Care Experts'
        ]
      }
    ]
  };

  const { data: insertData, error: insertError } = await supabase
    .from('resources')
    .insert([payload])
    .select();

  if (insertError) {
    console.error('Insert error:', insertError.message);
  } else {
    console.log('Successfully inserted into Supabase DB table resources! Item ID:', insertData?.[0]?.id);
  }
}

run();
