import { ArchetypeDefinition, OceanScores } from '../types';

// NOTE: ref vectors are the euclidean reference points used by matchArchetype().
// ref uses Resiliensi (R = 11 - N) for the 5th axis instead of Neuroticism.
// Convention for oceanPattern: high >= 7, med 4-6.9, low <= 4.
// OCEAN (archetype) is fully decoupled from MI (intelligence) — no primaryIntelligences.
export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'ARK_NEBULA_OWL',
    title: 'Si Burung Hantu Bijak',
    slogan: 'Dalam keheningan, aku menemukan kebijaksanaan',
    badge: 'Reflektif, Imajinatif & Penuh Empati',
    description: 'Anak dengan Keterbukaan dan Keramahan tinggi, namun cenderung tenang dan observatif. Mereka memproses dunia melalui observasi mendalam dan refleksi internal, memiliki imajinasi yang kaya serta kepekaan terhadap perasaan orang lain.',
    avatarIcon: 'Eye',
    oceanPattern: { o: 'high', c: 'med', e: 'low', a: 'high', n: 'med' },
    ref: { O: 8.5, C: 6.0, E: 3.0, A: 8.0, R: 5.5 },
    strengths: [
      'Daya imajinasi dan kreativitas internal yang sangat tinggi',
      'Kepekaan emosional terhadap perasaan orang lain',
      'Kemampuan observasi detail yang terlewat orang lain',
      'Mandiri dalam berpikir dan memecahkan masalah'
    ],
    challenges: [
      'Membutuhkan waktu lebih lama beradaptasi di lingkungan baru',
      'Cenderung menahan pendapat atau ragu mengungkapkan ide',
      'Mudah overstimulasi di tempat ramai/bising'
    ],
    learningStyleSummary: 'Observasi visual, refleksi mandiri, membaca, eksplorasi imajinatif di lingkungan tenang',
    communicationStyle: 'Nada tenang dan hangat, berikan jeda untuk merespons, validasi pikiran tanpa mendesak',
    markdownTemplatePrompt: 'Arketipe "Si Burung Hantu Bijak" menekankan kedalaman imajinasi, refleksi mandiri, dan kepekaan emosional. Fokuskan panduan pada memberi ruang waktu, stimulasi visual, serta teknik komunikasi tanpa paksaan.'
  },
  {
    id: 'ARK_COMET_FOX',
    title: 'Si Rubah Penjelajah Ceria',
    slogan: 'Dunia adalah taman bermain yang tak terbatas!',
    badge: 'Energik, Penasaran & Spontan',
    description: 'Anak dengan Keterbukaan dan Ekstraversi sangat tinggi. Penuh energi, penasaran, dan spontan. Mereka belajar dengan mencoba hal baru, bertemu orang, dan menjelajahi setiap sudut dunia dengan antusiasme yang menular.',
    avatarIcon: 'Compass',
    oceanPattern: { o: 'high', c: 'med', e: 'high', a: 'med', n: 'med' },
    ref: { O: 8.0, C: 5.0, E: 8.5, A: 6.0, R: 6.5 },
    strengths: [
      'Keberanian tinggi mencoba hal baru dan tantangan',
      'Energi sosial yang ceria dan menular',
      'Adaptasi cepat terhadap perubahan lingkungan',
      'Rasa ingin tahu yang tak terpuaskan'
    ],
    challenges: [
      'Sulit duduk diam dalam waktu lama',
      'Cenderung terburu-buru dan kurang teliti',
      'Mudah bosan dengan rutinitas atau penjelasan panjang'
    ],
    learningStyleSummary: 'Praktik langsung (hands-on), eksperimen, permainan aktif, dan eksplorasi outdoor',
    communicationStyle: 'Pesan singkat dan dinamis, ajak bergerak, gunakan instruksi visual/aksi',
    markdownTemplatePrompt: 'Arketipe "Si Rubah Penjelajah Ceria" berfokus pada gerakan, eksplorasi fisik, dan energi sosial. Salurkan energinya menjadi aktivitas produktif yang dinamis.'
  },
  {
    id: 'ARK_COSMIC_BEAVER',
    title: 'Si Berang-berang Kosmik',
    slogan: 'Setiap proyek besar dimulai dari satu susunan yang rapi',
    badge: 'Terstruktur, Tekun & Praktis',
    description: 'Anak dengan Ketelitian (Conscientiousness) yang sangat tinggi dan Resiliensi yang kuat. Mereka sistematis, fokus, dan pantang menyerah. Lebih suka bekerja dengan rencana jelas dan menyelesaikan tugas sampai tuntas daripada mengeksplorasi hal abstrak.',
    avatarIcon: 'Cpu',
    oceanPattern: { o: 'med', c: 'high', e: 'low', a: 'med', n: 'low' },
    ref: { O: 4.5, C: 9.0, E: 4.0, A: 6.5, R: 7.0 },
    strengths: [
      'Pola pikir sistematis dan terstruktur sejak dini',
      'Konsentrasi tinggi saat mengerjakan tugas',
      'Ketekunan luar biasa menyelesaikan proyek',
      'Menghargai keteraturan dan rutinitas'
    ],
    challenges: [
      'Perfeksionis — mudah frustrasi jika hasil tidak sesuai harapan',
      'Kaku saat menghadapi perubahan rencana mendadak',
      'Kurang nyaman dengan situasi sosial yang ambigu/tidak terstruktur'
    ],
    learningStyleSummary: 'Diagram, langkah-langkah terurut (step-by-step), problem solving, dan proyek konstruksi',
    communicationStyle: 'Berikan alasan logis "mengapa", gunakan instruksi terstruktur, hargai argumen kritisnya',
    markdownTemplatePrompt: 'Arketipe "Si Berang-berang Kosmik" membutuhkan kejelasan struktur, rencana, dan tujuan. Berikan proyek yang bisa diselesaikan tahap demi tahap.'
  },
  {
    id: 'ARK_MOON_DEER',
    title: 'Si Rusa Bulan',
    slogan: 'Aku merasakan dunia dengan hati yang lembut',
    badge: 'Empatis, Sensitif & Penuh Kasih',
    description: 'Anak dengan Keramahan sangat tinggi namun Resiliensi rendah. Sangat empatik, lembut, dan peka terhadap nuansa emosi di sekitarnya. Ia mudah tersentuh oleh keindahan dan kesedihan, tetapi juga mudah merasa cemas atau kewalahan di situasi menegangkan.',
    avatarIcon: 'Heart',
    oceanPattern: { o: 'high', c: 'med', e: 'low', a: 'high', n: 'high' },
    ref: { O: 7.0, C: 5.5, E: 3.5, A: 8.5, R: 3.5 },
    strengths: [
      'Empati mendalam — peka terhadap perasaan orang lain',
      'Kreativitas dan apresiasi keindahan (seni, musik, alam)',
      'Kepedulian alami terhadap makhluk hidup',
      'Kelembutan yang membuat orang merasa nyaman di dekatnya'
    ],
    challenges: [
      'Mudah cemas di situasi baru atau tidak familiar',
      'Sangat sensitif terhadap kritik atau nada suara keras',
      'Butuh waktu lama untuk tenang setelah emosi terganggu',
      'Cenderung menginternalisasi konflik orang lain'
    ],
    learningStyleSummary: 'Belajar di lingkungan yang aman dan hangat, melalui cerita, seni, musik, dan refleksi perasaan',
    communicationStyle: 'Nada sangat lembut dan menenangkan, hindari bentakan, validasi perasaan sebelum memberi arahan',
    markdownTemplatePrompt: 'Arketipe "Si Rusa Bulan" membutuhkan lingkungan emosional yang aman. Hindari tekanan, gunakan kelembutan, dan bimbing melalui seni serta cerita.'
  },
  {
    id: 'ARK_SUPERNOVA_LION',
    title: 'Si Singa Supernova',
    slogan: 'Aku bersinar terang dan tak takut memimpin!',
    badge: 'Berani, Karismatik & Tangguh',
    description: 'Anak dengan Ekstraversi dan Resiliensi sangat tinggi. Mereka adalah pemimpin alami — berani, karismatik, dan tangguh secara emosional. Penuh percaya diri, suka mengambil inisiatif, dan tidak takut menjadi pusat perhatian. Cenderung tegas dan kompetitif.',
    avatarIcon: 'Crown',
    oceanPattern: { o: 'high', c: 'med', e: 'high', a: 'med', n: 'low' },
    ref: { O: 7.5, C: 6.5, E: 9.0, A: 5.0, R: 8.5 },
    strengths: [
      'Kepemimpinan alami — suka mengambil inisiatif',
      'Karisma dan kemampuan mempengaruhi teman',
      'Resiliensi emosi yang kuat — cepat bangkit dari kegagalan',
      'Keberanian menghadapi tantangan dan hal baru'
    ],
    challenges: [
      'Bisa mendominasi dan kurang mendengarkan pendapat orang lain',
      'Tidak sabar dengan teman yang lebih lambat',
      'Cenderung kompetitif berlebihan',
      'Sulit menerima ketika bukan yang terbaik/pemenang'
    ],
    learningStyleSummary: 'Tantangan kompetitif, kepemimpinan kelompok, presentasi, dan proyek ambisius',
    communicationStyle: 'Jelas dan langsung, berikan tantangan, hargai kepemimpinan, ajarkan empati untuk orang lain',
    markdownTemplatePrompt: 'Arketipe "Si Singa Supernova" menonjolkan kepemimpinan, keberanian, dan resiliensi. Berikan tantangan dan tanggung jawab, sambil mengajarkan empati.'
  },
  {
    id: 'ARK_SPACE_WHALE',
    title: 'Si Paus Angkasa',
    slogan: 'Dalam keheningan, aku membawa kedamaian untuk semua',
    badge: 'Penuh Kasih, Tenang & Murah Hati',
    description: 'Anak dengan Keramahan luar biasa dan Resiliensi yang stabil, namun sangat introvert. Ia adalah raksasa lembut yang tenang, murah hati, dan menjadi sumber kedamaian bagi orang di sekitarnya. Jarang berbicara, tetapi ketika berbicara, kata-katanya penuh makna dan kebijaksanaan.',
    avatarIcon: 'Waves',
    oceanPattern: { o: 'med', c: 'med', e: 'low', a: 'high', n: 'low' },
    ref: { O: 6.5, C: 5.5, E: 2.5, A: 9.0, R: 7.0 },
    strengths: [
      'Kedermawanan dan kepedulian tanpa syarat',
      'Ketenangan yang menenangkan orang di sekitarnya',
      'Mendengarkan dengan seksama dan memberi dukungan emosional',
      'Stabil secara emosi — tidak mudah terganggu'
    ],
    challenges: [
      'Sangat tertutup — sulit mengungkapkan kebutuhan diri sendiri',
      'Cenderung mengorbankan keinginan pribadi demi orang lain',
      'Jarang mengambil inisiatif sosial',
      'Kesulitan menolak atau menetapkan batas'
    ],
    learningStyleSummary: 'Belajar dalam kelompok kecil yang aman, aktivitas kolaboratif yang tenang, dan refleksi mendalam',
    communicationStyle: 'Nada lembut, beri waktu untuk berpikir, tanyakan kebutuhannya secara langsung (jangan tunggu dia bicara)',
    markdownTemplatePrompt: 'Arketipe "Si Paus Angkasa" adalah raksasa lembut yang tenang dan murah hati. Berikan peran pendukung, tanyakan kebutuhannya secara langsung.'
  },
  {
    id: 'ARK_ASTRONOMER_CAT',
    title: 'Si Kucing Astronom',
    slogan: 'Setiap bintang menyimpan rahasia yang ingin kupecahkan',
    badge: 'Intelektual, Analitis & Mandiri',
    description: 'Anak dengan Keterbukaan dan Ketelitian yang sangat tinggi, namun cenderung penyendiri. Mereka adalah pemikir dan peneliti alami — sangat penasaran, analitis, dan sistematis. Lebih suka menyelidiki sesuatu secara mandiri daripada berinteraksi sosial. Bisa tampak dingin atau terpisah dari keramaian.',
    avatarIcon: 'Star',
    oceanPattern: { o: 'high', c: 'high', e: 'low', a: 'med', n: 'med' },
    ref: { O: 9.0, C: 7.0, E: 3.0, A: 5.5, R: 6.0 },
    strengths: [
      'Rasa ingin tahu intelektual yang tak terpuaskan',
      'Kemampuan analitis dan pemecahan masalah yang sistematis',
      'Fokus mendalam pada minat khusus',
      'Kemandirian dalam belajar dan mengeksplorasi'
    ],
    challenges: [
      'Cenderung menyendiri dan sulit membangun pertemanan',
      'Bisa tampak dingin atau acuh terhadap emosi orang lain',
      'Terlalu kritis terhadap diri sendiri dan orang lain',
      'Sulit dalam situasi sosial yang tidak terstruktur'
    ],
    learningStyleSummary: 'Penelitian mandiri, eksperimen, buku ensiklopedia, dan proyek ilmiah individual',
    communicationStyle: 'Berikan informasi faktual dan logis, hargai otonominya, jangan paksa interaksi sosial berlebihan',
    markdownTemplatePrompt: 'Arketipe "Si Kucing Astronom" adalah peneliti alami yang mandiri dan analitis. Berikan akses ke pengetahuan dan ruang privat untuk menyelidiki.'
  },
  {
    id: 'ARK_GALAXY_DOLPHIN',
    title: 'Si Lumba-lumba Galaksi',
    slogan: 'Hidup adalah petualangan yang lebih seru bila dibagi bersama!',
    badge: 'Ceria, Sosial & Penuh Empati',
    description: 'Anak dengan Ekstraversi dan Keramahan tinggi. Mereka adalah jiwa sosial sejati — ceria, ramah, dan mudah berteman. Sangat empatik dan suka bermain bersama. Energik namun penuh kehangatan, membuat setiap orang merasa diterima dan disukai.',
    avatarIcon: 'Users',
    oceanPattern: { o: 'high', c: 'med', e: 'high', a: 'high', n: 'med' },
    ref: { O: 7.0, C: 5.0, E: 8.5, A: 8.0, R: 6.5 },
    strengths: [
      'Kemampuan sosial yang luar biasa — mudah berteman',
      'Empati dan kepekaan terhadap perasaan teman',
      'Energi positif yang menular',
      'Senang berbagi dan berkolaborasi'
    ],
    challenges: [
      'Sangat membutuhkan interaksi sosial — sedih jika sendirian',
      'Cenderung people-pleasing (mengorbankan diri untuk menyenangkan orang)',
      'Mudah terdistraksi oleh aktivitas sosial',
      'Kesulitan fokus pada tugas individual'
    ],
    learningStyleSummary: 'Belajar kelompok, bermain peran (roleplay), mengajari teman, dan proyek kolaboratif',
    communicationStyle: 'Hangat dan ekspresif, diskusikan dampak sosial, berikan apresiasi publik, dengarkan kisahnya',
    markdownTemplatePrompt: 'Arketipe "Si Lumba-lumba Galaksi" menonjolkan kemampuan sosial, empati, dan kolaborasi. Berikan kesempatan belajar bersama dan mengajari teman.'
  },
  {
    id: 'ARK_SUPERNOVA_PEACOCK',
    title: 'Si Merak Supernova',
    slogan: 'Biarkan aku bersinar dengan warna-warni keindahan!',
    badge: 'Ekspresif, Kreatif & Teatrikal',
    description: 'Anak dengan Keterbukaan dan Ekstraversi tinggi, namun Ketelitian rendah. Ia adalah penampil alami — ekspresif, kreatif, dan suka menjadi pusat perhatian. Penuh ide liar dan cara unik untuk mengekspresikan diri. Emosi naik turun mengikuti ritme kreasi dan apresiasi.',
    avatarIcon: 'Sparkles',
    oceanPattern: { o: 'high', c: 'low', e: 'high', a: 'med', n: 'med' },
    ref: { O: 8.5, C: 3.5, E: 8.0, A: 6.0, R: 5.0 },
    strengths: [
      'Kreativitas dan ekspresi diri yang luar biasa',
      'Karisma dan kemampuan entertainer alami',
      'Kepekaan estetik (warna, suara, gerak)',
      'Keberanian tampil dan mengekspresikan diri'
    ],
    challenges: [
      'Sangat mudah terdistraksi dan sulit fokus',
      'Tidak teratur — sering berantakan dan lupa jadwal',
      'Emosi naik turun sesuai apresiasi/pujian',
      'Bila tidak dipuji, motivasi turun drastis'
    ],
    learningStyleSummary: 'Belajar melalui seni, musik, drama, performa, dan ekspresi kreatif. Hindari format kaku/rutin',
    communicationStyle: 'Beri pujian yang tulus dan spesifik, gunakan nada ekspresif, biarkan mengekspresikan diri, arahkan dengan lembut',
    markdownTemplatePrompt: 'Arketipe "Si Merak Supernova" adalah penampil kreatif yang ekspresif. Berikan panggung dan ruang berkreasi, hindari format kaku.'
  },
  {
    id: 'ARK_PLANETARY_PANDA',
    title: 'Si Panda Planet',
    slogan: 'Langkah pelanku, namun penuh ketegasan dan ketulusan',
    badge: 'Tenang, Setia & Dapat Diandalkan',
    description: 'Anak dengan Ketelitian, Keramahan, dan Resiliensi tinggi, namun Keterbukaan dan Ekstraversi rendah. Mereka adalah penjaga yang setia — tenang, dapat diandalkan, dan penuh kasih. Menghargai rutinitas dan kestabilan, tidak suka perubahan mendadak, dan menjadi tempat berteduh bagi teman-temannya.',
    avatarIcon: 'Shield',
    oceanPattern: { o: 'low', c: 'high', e: 'low', a: 'high', n: 'low' },
    ref: { O: 4.0, C: 8.0, E: 3.0, A: 8.5, R: 7.5 },
    strengths: [
      'Keandalan dan konsistensi — selalu menepati janji',
      'Ketenangan yang menstabilkan lingkungan sekitar',
      'Kepedulian dan kesetiaan terhadap teman',
      'Disiplin dan teratur dalam rutinitas harian'
    ],
    challenges: [
      'Tidak suka perubahan atau hal baru — sulit beradaptasi',
      'Kaku dan kurang fleksibel',
      'Terlalu pemalu untuk memulai interaksi sosial',
      'Bisa terlewat/diabaikan karena terlalu tenang'
    ],
    learningStyleSummary: 'Belajar dengan rutinitas terstruktur, pengulangan, lingkungan yang familiar dan tenang',
    communicationStyle: 'Nada tenang dan konsisten, beri waktu beradaptasi dengan hal baru, jangan paksa spontanitas',
    markdownTemplatePrompt: 'Arketipe "Si Panda Planet" adalah penjaga setia yang tenang dan dapat diandalkan. Berikan rutinitas, waktu beradaptasi, dan kestabilan.'
  }
];

export function getArchetypeById(id: string): ArchetypeDefinition {
  return ARCHETYPES.find(a => a.id === id) || ARCHETYPES[0];
}

// Euclidean distance matching: returns the archetype whose ref vector is
// closest (smallest Euclidean distance) to the child's OCEAN scores.
// The 5th axis uses Resiliensi (R = 11 - N) instead of Neuroticism so that
// "high" always means desirable (resilient/stable) on every axis.
export function matchArchetype(ocean: OceanScores): ArchetypeDefinition {
  // Convert child's Neuroticism to Resiliensi (R = 11 - N)
  const childR = 11 - ocean.neuroticism;

  let best = ARCHETYPES[0];
  let minDist = Infinity;
  for (const arch of ARCHETYPES) {
    const dist = Math.sqrt(
      Math.pow(ocean.openness - arch.ref.O, 2) +
      Math.pow(ocean.conscientiousness - arch.ref.C, 2) +
      Math.pow(ocean.extraversion - arch.ref.E, 2) +
      Math.pow(ocean.agreeableness - arch.ref.A, 2) +
      Math.pow(childR - arch.ref.R, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      best = arch;
    }
  }
  return best;
}
