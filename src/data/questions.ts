import { AssessmentQuestion, ChildProfile } from '../types';

// Reverse scoring per IPIP conventions:
// - OCEAN reverse items (8): ids 5, 6, 11, 14, 19, 21, 24, 27
// - MI reverse items (8):     ids 40, 44, 49, 54, 58, 65, 69, 73
// Total: 16 reverse items out of 75 (~21%).
// Reverse scoring applies 6 - val internally; the UI still shows the raw 1-5 selection.
export const OCEAN_QUESTIONS: AssessmentQuestion[] = [
  // Openness (1-7) — reverse: 5, 6
  { id: 1, type: 'OCEAN', dimension: 'openness', statement: 'Anak senang mencoba hal-hal baru, makanan baru, atau rute jalan yang belum pernah dilewati.', reverse: false },
  { id: 2, type: 'OCEAN', dimension: 'openness', statement: 'Anak sering menunjukkan imajinasi kaya saat bermain sendirian (misal: membuat cerita unik).', reverse: false },
  { id: 3, type: 'OCEAN', dimension: 'openness', statement: 'Anak sering mengajukan pertanyaan mendalam seperti "kenapa langit biru?" atau "bagaimana bintang bekerja?".', reverse: false },
  { id: 4, type: 'OCEAN', dimension: 'openness', statement: 'Anak tertarik pada kegiatan seni, warna, gambar, atau musik.', reverse: false },
  { id: 5, type: 'OCEAN', dimension: 'openness', statement: 'Anak cepat menangkap konsep abstrak atau ide permainan yang baru dikenalkan.', reverse: true },
  { id: 6, type: 'OCEAN', dimension: 'openness', statement: 'Anak suka bereksperimen menggabungkan berbagai objek mainan dengan cara tidak biasa.', reverse: true },
  { id: 7, type: 'OCEAN', dimension: 'openness', statement: 'Anak menikmati cerita dongeng atau buku bergambar dengan alur fantastis.', reverse: false },

  // Conscientiousness (8-14) — reverse: 11, 14
  { id: 8, type: 'OCEAN', dimension: 'conscientiousness', statement: 'Anak terbiasa merapikan mainan atau barang pribadinya setelah digunakan.', reverse: false },
  { id: 9, type: 'OCEAN', dimension: 'conscientiousness', statement: 'Anak menyelesaikan tugas sekolah/prakarya sampai tuntas sebelum berpindah kegiatan.', reverse: false },
  { id: 10, type: 'OCEAN', dimension: 'conscientiousness', statement: 'Anak menyukai jadwal harian yang teratur dan konsisten.', reverse: false },
  { id: 11, type: 'OCEAN', dimension: 'conscientiousness', statement: 'Anak berhati-hati agar tidak merusak barang dan memperhatikan instruksi dengan seksama.', reverse: true },
  { id: 12, type: 'OCEAN', dimension: 'conscientiousness', statement: 'Anak bisa fokus pada satu aktivitas selama 15-30 menit tanpa mudah terdistraksi.', reverse: false },
  { id: 13, type: 'OCEAN', dimension: 'conscientiousness', statement: 'Anak berusaha menepati janji sederhana yang telah disepakati bersama.', reverse: false },
  { id: 14, type: 'OCEAN', dimension: 'conscientiousness', statement: 'Anak memeriksa kembali hasil pekerjaannya agar tidak ada yang terlewat.', reverse: true },

  // Extraversion (15-21) — reverse: 19, 21
  { id: 15, type: 'OCEAN', dimension: 'extraversion', statement: 'Anak terlihat sangat bersemangat saat berada di tengah keramaian atau teman sebayanya.', reverse: false },
  { id: 16, type: 'OCEAN', dimension: 'extraversion', statement: 'Anak mudah menyapa atau berkenalan dengan orang baru tanpa ragu.', reverse: false },
  { id: 17, type: 'OCEAN', dimension: 'extraversion', statement: 'Anak banyak berbicara, bercerita, dan mengekspresikan antusiasme secara terbuka.', reverse: false },
  { id: 18, type: 'OCEAN', dimension: 'extraversion', statement: 'Anak mendapatkan kembali energinya setelah bermain bersama kelompok.', reverse: false },
  { id: 19, type: 'OCEAN', dimension: 'extraversion', statement: 'Anak suka tampil di depan umum, menari, atau menjadi pusat perhatian.', reverse: true },
  { id: 20, type: 'OCEAN', dimension: 'extraversion', statement: 'Anak lebih memilih aktivitas kelompok dibanding bermain sendirian.', reverse: false },
  { id: 21, type: 'OCEAN', dimension: 'extraversion', statement: 'Anak secara spontan mengungkapkan apa yang dipikirkannya tanpa ragu.', reverse: true },

  // Agreeableness (22-28) — reverse: 24, 27
  { id: 22, type: 'OCEAN', dimension: 'agreeableness', statement: 'Anak bersedia berbagi makanan atau mainan favoritnya dengan teman.', reverse: false },
  { id: 23, type: 'OCEAN', dimension: 'agreeableness', statement: 'Anak cepat merasa kasihan jika melihat orang lain atau hewan yang bersedih/terluka.', reverse: false },
  { id: 24, type: 'OCEAN', dimension: 'agreeableness', statement: 'Anak jarang memicu pertengkaran dan lebih suka mengalah demi kebaikan bersama.', reverse: true },
  { id: 25, type: 'OCEAN', dimension: 'agreeableness', statement: 'Anak kooperatif dan mau membantu pekerjaan rumah tangga yang ringan.', reverse: false },
  { id: 26, type: 'OCEAN', dimension: 'agreeableness', statement: 'Anak ramah dan mengucapkan kata "terima kasih", "maaf", dan "tolong" dengan wajar.', reverse: false },
  { id: 27, type: 'OCEAN', dimension: 'agreeableness', statement: 'Anak mendengarkan nasihat orang tua dengan penuh rasa hormat.', reverse: true },
  { id: 28, type: 'OCEAN', dimension: 'agreeableness', statement: 'Anak berusaha menghibur kawan atau saudaranya yang sedang menangis.', reverse: false },

  // Neuroticism / Emotion Sensitivity (29-35) — all forward (no reverse)
  { id: 29, type: 'OCEAN', dimension: 'neuroticism', statement: 'Anak mudah merasa cemas atau gugup ketika berada di situasi baru.', reverse: false },
  { id: 30, type: 'OCEAN', dimension: 'neuroticism', statement: 'Anak sering mengalami suasana hati yang berubah cepat (moody).', reverse: false },
  { id: 31, type: 'OCEAN', dimension: 'neuroticism', statement: 'Anak membutuhkan waktu lama untuk tenang kembali setelah marah atau kecewa.', reverse: false },
  { id: 32, type: 'OCEAN', dimension: 'neuroticism', statement: 'Anak sangat sensitif terhadap nada bicara keras atau teguran.', reverse: false },
  { id: 33, type: 'OCEAN', dimension: 'neuroticism', statement: 'Anak sering khawatir tentang kesalahan yang mungkin dilakukannya.', reverse: false },
  { id: 34, type: 'OCEAN', dimension: 'neuroticism', statement: 'Anak mudah merasa frustrasi saat mengalami kesulitan dalam suatu tugas.', reverse: false },
  { id: 35, type: 'OCEAN', dimension: 'neuroticism', statement: 'Anak sering meminta rasa aman atau pelukan ekstra dari orang tua.', reverse: false }
];

export const MI_QUESTIONS: AssessmentQuestion[] = [
  // Linguistic (36-40) — reverse: 40
  { id: 36, type: 'MI', dimension: 'linguistic', statement: 'Anak sangat menyukai mendengarkan dongeng, membaca buku, atau bermain tebak kata.', reverse: false },
  { id: 37, type: 'MI', dimension: 'linguistic', statement: 'Anak memiliki perbendaharaan kata yang kaya untuk usianya.', reverse: false },
  { id: 38, type: 'MI', dimension: 'linguistic', statement: 'Anak senang mengeja, menulis nama, atau menghafal rima/puisi.', reverse: false },
  { id: 39, type: 'MI', dimension: 'linguistic', statement: 'Anak dapat menceritakan kembali kejadian dengan urutan peristiwa yang jelas.', reverse: false },
  { id: 40, type: 'MI', dimension: 'linguistic', statement: 'Anak suka bertanya makna dari kata-kata sulit yang baru didengarnya.', reverse: true },

  // Logical-Mathematical (41-45) — reverse: 44
  { id: 41, type: 'MI', dimension: 'logical', statement: 'Anak tertarik dengan angka, berhitung, atau mengelompokkan benda berdasarkan pola.', reverse: false },
  { id: 42, type: 'MI', dimension: 'logical', statement: 'Anak suka bertanya tentang hubungan sebab-akibat ("Kenapa kalau air dipanaskan jadi uap?").', reverse: false },
  { id: 43, type: 'MI', dimension: 'logical', statement: 'Anak menikmati permainan teka-teki, catur, labirin, atau puzzle logika.', reverse: false },
  { id: 44, type: 'MI', dimension: 'logical', statement: 'Anak dengan cepat menemukan cara kerja alat mekanis atau aplikasi game sederhana.', reverse: true },
  { id: 45, type: 'MI', dimension: 'logical', statement: 'Anak suka menghitung barang di sekitarnya secara spontan.', reverse: false },

  // Spatial-Visual (46-50) — reverse: 49
  { id: 46, type: 'MI', dimension: 'spatial', statement: 'Anak suka menggambar, mewarnai, atau membuat bentuk dari plastisin/Lego.', reverse: false },
  { id: 47, type: 'MI', dimension: 'spatial', statement: 'Anak mudah mengingat lokasi tempat, rute jalan, atau posisi barang yang tersembunyi.', reverse: false },
  { id: 48, type: 'MI', dimension: 'spatial', statement: 'Anak menikmati melihat peta bergambar, diagram, atau video visual berwarna.', reverse: false },
  { id: 49, type: 'MI', dimension: 'spatial', statement: 'Anak peka terhadap perpaduan warna, pakaian, atau dekorasi ruangan.', reverse: true },
  { id: 50, type: 'MI', dimension: 'spatial', statement: 'Anak pandai membayangkan bentuk 3D saat membangun balok.', reverse: false },

  // Kinesthetic (51-55) — reverse: 54
  { id: 51, type: 'MI', dimension: 'kinesthetic', statement: 'Anak sulit duduk diam dalam jangka waktu lama dan selalu ingin bergerak.', reverse: false },
  { id: 52, type: 'MI', dimension: 'kinesthetic', statement: 'Anak unggul dalam kegiatan fisik seperti berlari, menari, memanjat, atau berolahraga.', reverse: false },
  { id: 53, type: 'MI', dimension: 'kinesthetic', statement: 'Anak lebih cepat memahami sesuatu saat mempraktikkan langsung dengan tangannya.', reverse: false },
  { id: 54, type: 'MI', dimension: 'kinesthetic', statement: 'Anak sering menggunakan bahasa tubuh atau gesture saat berbicara.', reverse: true },
  { id: 55, type: 'MI', dimension: 'kinesthetic', statement: 'Anak memiliki keseimbangan tubuh dan koordinasi motorik yang bagus.', reverse: false },

  // Musical (56-60) — reverse: 58
  { id: 56, type: 'MI', dimension: 'musical', statement: 'Anak dengan mudah menghafal nada dan lirik lagu baru.', reverse: false },
  { id: 57, type: 'MI', dimension: 'musical', statement: 'Anak sering bergumam, bersenandung, atau mengetuk-ngetuk benda mengikuti irama.', reverse: false },
  { id: 58, type: 'MI', dimension: 'musical', statement: 'Anak peka terhadap suara instrumen musik atau perubahan nada bicara orang lain.', reverse: true },
  { id: 59, type: 'MI', dimension: 'musical', statement: 'Anak menikmati memainkan alat musik mainan (pianika, drum, gitar mainan).', reverse: false },
  { id: 60, type: 'MI', dimension: 'musical', statement: 'Anak belajar lebih tenang saat diiringi musik yang disukainya.', reverse: false },

  // Interpersonal (61-65) — reverse: 65
  { id: 61, type: 'MI', dimension: 'interpersonal', statement: 'Anak memiliki banyak teman dan disukai dalam kelompok bermain.', reverse: false },
  { id: 62, type: 'MI', dimension: 'interpersonal', statement: 'Anak peka terhadap perasaan kawan sebayanya dan pandai membaca ekspresi wajah.', reverse: false },
  { id: 63, type: 'MI', dimension: 'interpersonal', statement: 'Anak sering diandalkan menjadi pemimpin atau penengah saat bermain bersama.', reverse: false },
  { id: 64, type: 'MI', dimension: 'interpersonal', statement: 'Anak menikmati proyek kolaboratif dibanding bekerja sendirian.', reverse: false },
  { id: 65, type: 'MI', dimension: 'interpersonal', statement: 'Anak pandai membujuk kawan sebayanya dengan kata-kata yang baik.', reverse: true },

  // Intrapersonal (66-70) — reverse: 69
  { id: 66, type: 'MI', dimension: 'intrapersonal', statement: 'Anak memahami emosi dirinya sendiri (dapat berkata "Aku sedang cemas/kecewa").', reverse: false },
  { id: 67, type: 'MI', dimension: 'intrapersonal', statement: 'Anak memiliki tujuan yang jelas tentang apa yang ingin dilakukannya saat bermain.', reverse: false },
  { id: 68, type: 'MI', dimension: 'intrapersonal', statement: 'Anak menikmati waktu sendiri untuk berpikir, menulis buku harian, atau merenung.', reverse: false },
  { id: 69, type: 'MI', dimension: 'intrapersonal', statement: 'Anak memiliki prinsip yang teguh dan tidak mudah ikut-ikutan tren kawan.', reverse: true },
  { id: 70, type: 'MI', dimension: 'intrapersonal', statement: 'Anak belajar dari kesalahan masa lalu dengan sangat bijaksana.', reverse: false },

  // Naturalist (71-75) — reverse: 73
  { id: 71, type: 'MI', dimension: 'naturalist', statement: 'Anak sangat menyukai hewan peliharaan, tanaman, atau aktivitas di alam terbuka.', reverse: false },
  { id: 72, type: 'MI', dimension: 'naturalist', statement: 'Anak suka mengoleksi batu, daun, kerang, atau benda-benda alam unik.', reverse: false },
  { id: 73, type: 'MI', dimension: 'naturalist', statement: 'Anak peka terhadap perubahan cuaca, musim, atau lingkungan di sekitarnya.', reverse: true },
  { id: 74, type: 'MI', dimension: 'naturalist', statement: 'Anak tertarik membaca buku ensiklopedia hewan, dinosaurus, atau antariksa.', reverse: false },
  { id: 75, type: 'MI', dimension: 'naturalist', statement: 'Anak senang berkebun, menyiram bunga, atau memberi makan hewan.', reverse: false }
];

export const SAMPLE_PROFILES: ChildProfile[] = [
  {
    id: 'sample-1',
    name: 'Budi Kurniawan',
    age: 7,
    gender: 'Laki-laki',
    parentName: 'Ibu Ratna & Bapak Herman',
    oceanScores: {
      openness: 9,
      conscientiousness: 6,
      extraversion: 4,
      agreeableness: 8,
      neuroticism: 7
    },
    miScores: {
      linguistic: 85,
      logical: 60,
      spatial: 92,
      kinesthetic: 50,
      musical: 70,
      interpersonal: 45,
      intrapersonal: 88,
      naturalist: 65
    },
    archetypeId: 'ARK_NEBULA_OWL',
    createdDate: '2026-08-07'
  },
  {
    id: 'sample-2',
    name: 'Aisyah Putri',
    age: 5,
    gender: 'Perempuan',
    parentName: 'Mama Sinta',
    oceanScores: {
      openness: 8,
      conscientiousness: 4,
      extraversion: 9,
      agreeableness: 7,
      neuroticism: 3
    },
    miScores: {
      linguistic: 65,
      logical: 50,
      spatial: 70,
      kinesthetic: 95,
      musical: 75,
      interpersonal: 85,
      intrapersonal: 40,
      naturalist: 90
    },
    archetypeId: 'ARK_COMET_FOX',
    createdDate: '2026-08-07'
  },
  {
    id: 'sample-3',
    name: 'Reyhan Pratama',
    age: 9,
    gender: 'Laki-laki',
    parentName: 'Ayah Dimas',
    oceanScores: {
      openness: 7,
      conscientiousness: 9,
      extraversion: 5,
      agreeableness: 6,
      neuroticism: 5
    },
    miScores: {
      linguistic: 70,
      logical: 95,
      spatial: 90,
      kinesthetic: 60,
      musical: 55,
      interpersonal: 50,
      intrapersonal: 80,
      naturalist: 60
    },
    archetypeId: 'ARK_COSMIC_BEAVER',
    createdDate: '2026-08-07'
  }
];
