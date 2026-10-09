/**
 * Contoh konkret per soal (id 1–75) — perilaku sehari-hari yang bisa diamati
 * orang tua. Ditampilkan di bawah pernyataan soal agar lebih mudah dinilai.
 *
 * Dipisah dari `questions.ts` agar perubahan contoh tidak menyentuh definisi
 * soal (skoring/urutan tetap utuh). Ada pengaman di `questions.ts`: setiap soal
 * akan mendapat `example` dari map ini berdasarkan `id`.
 */
export const QUESTION_EXAMPLES: Record<number, string> = {
  // ===== OCEAN: Openness =====
  1: 'Contoh: bersemangat saat diajak lewat jalan baru, atau mau mencicipi masakan yang belum pernah ia coba.',
  2: 'Contoh: mainan dinosaurusnya ia jadikan tokoh cerita lengkap dengan nama dan jalan cerita sendiri.',
  3: 'Contoh: saat melihat bulan, ia bertanya "kenapa bulan ikut terus kalau kita jalan?".',
  4: 'Contoh: betah berlama-lama mewarnai, atau gembira saat mendengar lagu kesukaannya.',
  5: 'Contoh: cukup dijelaskan sekali aturan permainan baru, ia langsung paham dan bisa ikut bermain.',
  6: 'Contoh: balok dan tutup botol dirangkai jadi "robot", bukan sekadar ditumpuk.',
  7: 'Contoh: minta dibacakan cerita naga atau peri berulang kali sampai hafal jalan ceritanya.',

  // ===== OCEAN: Conscientiousness =====
  8: 'Contoh: selepas bermain, ia memasukkan mainan ke kotak tanpa perlu disuruh berkali-kali.',
  9: 'Contoh: menuntaskan lembar mewarnai sampai habis dulu, baru minta main gadget.',
  10: 'Contoh: ia mengingatkan waktu mandi, makan, atau tidur, dan protes bila urutannya diubah.',
  11: 'Contoh: memegang gelas dengan dua tangan, dan mendengarkan dulu sebelum memakai alat baru.',
  12: 'Contoh: asyik menyusun puzzle atau menggambar lebih dari 15 menit tanpa berpindah-pindah.',
  13: 'Contoh: sudah sepakat main 30 menit lalu berhenti, dan ia benar-benar berhenti tepat waktu.',
  14: 'Contoh: mengecek ulang isi tas sekolah sebelum berangkat agar tidak ada buku yang tertinggal.',

  // ===== OCEAN: Extraversion =====
  15: 'Contoh: semakin ramai dan riuh suasananya, semakin aktif ia ikut bergabung bermain.',
  16: 'Contoh: langsung menyapa anak baru di taman dan mengajaknya ikut bermain.',
  17: 'Contoh: banyak bercerita tentang hari-harinya dan sulit berhenti berbicara bila sedang bersemangat.',
  18: 'Contoh: bukannya lelah, ia justru makin bersemangat setelah bermain bersama banyak teman.',
  19: 'Contoh: dengan senang hati maju ke depan untuk menari, menyanyi, atau memimpin tepuk tangan.',
  20: 'Contoh: bila diberi pilihan, ia memilih bermain bersama teman daripada main sendiri di rumah.',
  21: 'Contoh: langsung menyebut apa yang ia pikirkan atau rasakan tanpa menyaring dulu.',

  // ===== OCEAN: Agreeableness =====
  22: 'Contoh: mau membagi kue atau mainan favoritnya kepada teman tanpa dipaksa.',
  23: 'Contoh: ikut sedih dan ingin menolong saat melihat kucing terluka atau teman menangis.',
  24: 'Contoh: saat berebut mainan, ia lebih memilih mengalah daripada berkelahi.',
  25: 'Contoh: tanpa diminta, ia ikut membantu merapikan meja atau mengangkat barang ringan.',
  26: 'Contoh: terbiasa mengucapkan "tolong", "terima kasih", dan "maaf" pada saat yang tepat.',
  27: 'Contoh: berhenti melakukan sesuatu saat dinasihati, dan mendengarkan penjelasan orang tua.',
  28: 'Contoh: mendekati saudaranya yang menangis dan berusaha menghibur atau memeluknya.',

  // ===== OCEAN: Neuroticism (Sensitivitas Emosi) =====
  29: 'Contoh: menempel erat pada orang tua dan menolak masuk saat pertama kali ke tempat baru.',
  30: 'Contoh: pagi ceria, sebentar kemudian menangis, lalu kembali riang tanpa sebab yang jelas.',
  31: 'Contoh: setelah marah atau kecewa, butuh waktu lama untuk kembali tenang dan ceria.',
  32: 'Contoh: langsung murung atau menahan tangis hanya karena nada bicara yang agak keras.',
  33: 'Contoh: bertanya "nanti kalau salah bagaimana?" sebelum mengerjakan tugas.',
  34: 'Contoh: cepat menyerah dan kesal saat puzzle yang dikerjakan ternyata sulit.',
  35: 'Contoh: sering meminta digendong, dipeluk, atau ditemani saat merasa tidak aman.',

  // ===== MI: Linguistic =====
  36: 'Contoh: minta dibacakan buku berulang kali, dan betah mendengarkan cerita panjang.',
  37: 'Contoh: memakai kata seperti "sebenarnya", "tiba-tiba", atau "padahal" dengan tepat.',
  38: 'Contoh: mengeja nama sendiri, atau menghafal dan melafalkan pantun serta lagu.',
  39: 'Contoh: menceritakan kejadian di sekolah secara berurutan: "tadi aku..., terus..., lalu...".',
  40: 'Contoh: bertanya "apa artinya \'luar biasa\'?" setelah mendengar kata baru.',

  // ===== MI: Logical-Mathematical =====
  41: 'Contoh: menyusun mainan berdasarkan warna atau ukuran, dan senang menyebut angka.',
  42: 'Contoh: bertanya "kenapa es mencair?" atau "kenapa kalau hujan ada pelangi?".',
  43: 'Contoh: betah mengerjakan puzzle, labirin di buku, atau permainan strategi sederhana.',
  44: 'Contoh: cepat tahu cara memasang baterai atau membuka level di game tanpa diajari.',
  45: 'Contoh: tiba-tiba menghitung anak tangga, kendaraan lewat, atau potongan kue di meja.',

  // ===== MI: Spatial-Visual =====
  46: 'Contoh: senang menggambar, mewarnai, atau membentuk sesuatu dari plastisin dan Lego.',
  47: 'Contoh: ingat jalan pulang ke rumah nenek, atau tahu persis letak mainan yang disembunyikan.',
  48: 'Contoh: gemar melihat peta bergambar, diagram, atau video berwarna dan penuh gambar.',
  49: 'Contoh: memilih sendiri perpaduan warna baju, atau menata ulang dekorasi kamarnya.',
  50: 'Contoh: menyusun balok menjadi jembatan atau menara tanpa contoh gambar.',

  // ===== MI: Kinesthetic =====
  51: 'Contoh: sulit duduk tenang, selalu berdiri atau bergerak walau sedang menonton.',
  52: 'Contoh: menonjol saat berlari, memanjat, menari, atau bermain bola dibanding teman sebaya.',
  53: 'Contoh: lebih cepat paham cara mengikat tali sepatu dengan langsung mencoba, bukan dari penjelasan.',
  54: 'Contoh: tangannya otomatis mengayun dan bergerak saat bercerita.',
  55: 'Contoh: berjalan di garis, bersepeda, atau bermain di jungle gym dengan lincah dan seimbang.',

  // ===== MI: Musical =====
  56: 'Contoh: sekali dengar lagu baru, ia sudah bisa menyanyikan nadanya dengan tepat.',
  57: 'Contoh: bersenandung sambil bermain, atau mengetuk meja mengikuti irama lagu.',
  58: 'Contoh: langsung tahu saat nada lagu berubah, atau peka saat suara orang tua sedang kesal.',
  59: 'Contoh: senang memukul drum mainan, menekan pianika, atau memetik gitar mainan.',
  60: 'Contoh: lebih mudah mengerjakan tugas atau tidur saat ada musik yang ia sukai.',

  // ===== MI: Interpersonal =====
  61: 'Contoh: mudah bergabung dengan kelompok baru dan dipanggil-panggil teman untuk bermain.',
  62: 'Contoh: tahu saat temannya sedih, lalu menawarkan ikut bermain atau menenangkannya.',
  63: 'Contoh: dipilih teman-temannya untuk memimpin permainan atau menengahi perebutan.',
  64: 'Contoh: memilih mengerjakan proyek bersama teman daripada sendirian.',
  65: 'Contoh: dengan kata-kata yang lembut, ia bisa mengajak teman mengikuti idenya tanpa bertengkar.',

  // ===== MI: Intrapersonal =====
  66: 'Contoh: bisa mengucapkan "aku sedang sedih" atau "aku takut" saat merasakannya.',
  67: 'Contoh: punya rencana sendiri saat bermain: "aku mau bikin ini dulu, baru itu".',
  68: 'Contoh: memilih menyendiri sebentar untuk menggambar atau memikirkan sesuatu.',
  69: 'Contoh: tetap pada pendiriannya walau teman-temannya memilih hal yang berbeda.',
  70: 'Contoh: setelah gagal, ia berkata "lain kali aku coba cara yang berbeda" dan benar melakukannya.',

  // ===== MI: Naturalist =====
  71: 'Contoh: senang mengamati semut, memelihara ikan, atau bermain lama di kebun.',
  72: 'Contoh: mengumpulkan batu, daun, atau kerang dan menyimpannya seperti koleksi berharga.',
  73: 'Contoh: memperhatikan dan menyebut saat cuaca berubah, atau saat bunga mulai bermekaran.',
  74: 'Contoh: betah melihat buku bergambar hewan, dinosaurus, atau luar angkasa dan bertanya banyak hal.',
  75: 'Contoh: ikut menyiram tanaman atau memberi makan hewan peliharaan setiap hari.'
};
