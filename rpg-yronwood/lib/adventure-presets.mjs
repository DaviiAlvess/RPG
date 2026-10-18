// Histórias originais à margem de universos conhecidos — elenco inventado, poderes com limite.
const power = (name, description, limits, secret = true) => ({
  enabled: true,
  name,
  description,
  limits,
  secret,
});

const WORLD_NOTE =
  "Aventura original paralela, sem data canônica específica. Permaneça na física, nos lugares e no sistema de poder deste mundo; não atribua estes acontecimentos à obra oficial. O jogador não substitui protagonistas canônicos.";

export const ADVENTURE_PRESETS = [
  {
    id: "naruto",
    world: "Naruto",
    charName: "Ren Aoki",
    charTitle: "Corredor de encomendas da Vila do Vale Nebuloso",
    charAge: "21",
    genre: "Mistério ninja",
    hook: "Uma encomenda sem destinatário atrai olhares — e o chakra dela não é de mercadoria.",
    charBg:
      "Filho de comerciantes de estrada, cresceu entre postos de pedágio e atalhos de floresta. Nunca entrou numa academia ninja; aprendeu a sumir com pacotes e a ler o medo no rosto de quem entrega. Deve dinheiro a Mika e ainda sonha em comprar um nome limpo.",
    charPersonality:
      "Observador até o ponto da paranoia; leal a quem lhe deu pão, mas mente por proteção. Odeia violência barulhenta, ri nervoso quando mente, e guarda culpas antigas de ter abandonado um parceiro num assalto. Quer parecer útil — tem medo de ser descartável.",
    charSkills:
      "Orientação noturna, corrida de resistência, esconder volumes, primeiros socorros rústicos, leitura de posturas. Sem jutsus de clã.",
    supportingCast:
      "Mika — estalajadeira; seca, conta moedas em voz alta, esconde afeto atrás de cobrança; confiou a entrega e te olha como se já soubesse que você vai falhar. Kaji — viajante de capa úmida; fala baixo demais, pergunta o preço do pacote como quem já sabe o conteúdo; tique: limpa a unha da faca na bota.",
    storyStartPoint:
      "A poeira da estrada de terra da Vila do Vale Nebuloso entra na boca quando a carroça trava na saída do portão de madeira. O pacote sem selo lateja quente no colo — chakra fraco, errado, como um animal dormindo. Kaji já está junto da roda, perto demais, e estende a mão aberta. Mika: \"Ren. Se entregar isso errado, não volta para a minha mesa.\" Kaji: \"O preço que ela te pagou é esmola. Me dá o volume e você some vivo.\"",
    narration: { style: "cinematic", length: "balanced", pace: "balanced" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Mãos calejadas, tornozeleira de corda, jaqueta com bolsos costurados por dentro.",
    relationships: { Mika: "Amigável", Kaji: "Suspeito" },
    worldState: {
      location: "Portão sul da Vila do Vale Nebuloso",
      npcs: {
        Mika: "estalajadeira; seca e protetora, cobra em voz alta; Vale Nebuloso; confiou a encomenda",
        Kaji: "viajante; fala baixa, limpa a faca na bota; estrada; quer o pacote",
      },
    },
    plots: [{ title: "O pacote sem nome", hook: "Alguém paga caro por um volume que lateja chakra — Mika e Kaji puxam em sentidos opostos." }],
    specialAbility: power(
      "Selo de Esconderijo",
      "Você pode marcar um objeto pequeno com um selo rudimentar: por alguns minutos ele parece vazio de chakra e mais leve aos sentidos. Não some de verdade — só engana a percepção.",
      "Uma vez por cena; cansaço e sangramento no nariz se forçado. Não esconde pessoas vivas. Ninjas treinados podem desconfiar se olharem de perto.",
      true
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "one-piece",
    world: "One Piece",
    charName: "Lia Maré",
    charTitle: "Aprendiz de carpinteira no Estaleiro Maré Baixa",
    charAge: "23",
    genre: "Mar e liberdade",
    hook: "Um barco chega sozinho ao cais — e sob o casco há um pedido escrito com sangue de tinta.",
    charBg:
      "Órfã de um porto secundário da East Blue, cresceu medindo tábuas e ouvindo histórias de Grand Line que ninguém daqui chega a ver. Bento a tirou da rua; ela odeia dever favores e ainda assim deve a vida a ele. Sonha com um navio próprio, não com fama.",
    charPersonality:
      "Inventiva e teimosa; generosa com quem tem fome, dura com quem manda sem sujar as mãos. Fala com as mãos (desenha no ar). Quando mente, assobia fora do tom. Medo secreto: ser deixada em terra enquanto o mundo segue.",
    charSkills: "Reparo de casco, nós, natação, ferramentas, cheiro de madeira podre vs. boa. Sem Akuma no Mi.",
    supportingCast:
      "Bento — patrão do estaleiro; voz grossa, humor cruel, protege a oficina como um filho; quer desmontar o barco antes do amanhecer para cobrir dívida. Iara — pescadora; reconhece o casco, fala em metáforas de maré, evita olhar nos olhos; tique: enrola a rede nos pulsos quando mente.",
    storyStartPoint:
      "A água da East Blue sobe gelada pelos tornozelos no Estaleiro Maré Baixa. Você ajoelha no casco abandonado que Bento quer virar lenha até o alvorecer. Sob a tábua solta, os dedos acham papel úmido: um pedido de ajuda, tinta ainda vermelha nas bordas. Bento: \"Antes do sol, isso vira tábua. Sem drama.\" Iara, na beira do cais: \"Esse barco não deveria estar flutuando. Quem o enviou já está morto — ou pior.\"",
    narration: { style: "light", length: "balanced", pace: "balanced" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Farrapos de sal, óculos improvisados na testa, lascas de madeira nos cabelos.",
    relationships: { Bento: "Amigável", Iara: "Neutral" },
    worldState: {
      location: "Estaleiro Maré Baixa, porto secundário da East Blue",
      npcs: {
        Bento: "patrão; voz grossa, humor cruel; estaleiro; quer desmontar o barco",
        Iara: "pescadora; metáforas de maré, enrola rede nos pulsos; cais; reconhece o casco",
      },
    },
    plots: [{ title: "O barco sem tripulação", hook: "Um casco chega sozinho com um pedido de ajuda — desmontar é apagar a última pista." }],
    specialAbility: power(
      "Ouvido do Casco",
      "Ao tocar madeira de navio, você sente vibrações: rachaduras, peso escondido, se alguém esteve ali há pouco. Não lê mentes — só o 'corpo' do barco.",
      "Precisa de contato com as mãos limpas de óleo demais. Em combate ou tempestade a sensação some. Não funciona em metal puro.",
      true
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "harry-potter",
    world: "Harry Potter",
    charName: "Clara Vale",
    charTitle: "Auxiliar da loja Relíquias & Restos",
    charAge: "24",
    genre: "Mistério mágico",
    hook: "Um objeto comum começa a devolver cartas que nunca foram enviadas — uma delas traz o seu endereço.",
    charBg:
      "Bruxa de formação mediana, sem sobrenome famoso. Cataloga objetos usados num beco lateral de um mercado mágico secundário. Dora a contratou porque Clara não faz perguntas em voz alta — até agora.",
    charPersonality:
      "Curiosa demais para o próprio bem; cuidadosa com regras até achar uma falha. Evita confronto, mas anota tudo. Quando nervosa, organiza prateleiras. Segredo: já abriu um artefato proibido e mentiu no relatório.",
    charSkills: "Feitiços cotidianos, catalogação, observação, latim de etiqueta. Sem dons únicos de sangue.",
    supportingCast:
      "Dora — dona da loja; elegante, impaciente, protege o nome da casa; exige discrição absoluta. Elias — cliente; afirma que o objeto é dele, fala demais, suor na testa; tique: ajusta a gravata inexistente.",
    storyStartPoint:
      "O cadeado de Relíquias & Restos ainda está frio na palma quando a gaveta lacrada cede. Uma carta cai no seu colo: cheiro de fuligem, tinta recente, endereço — o da sua casa. Do outro lado da vitrine, Elias não pisca. Dora, sem olhar: \"Clara. Se isso vazar, você some do livro-caixa.\" Elias: \"Esse objeto é meu. Entrega agora e ninguém precisa saber o que ele escreve.\"",
    narration: { style: "literary", length: "balanced", pace: "balanced" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Dedos manchados de tinta, avental com bolsos etiquetados, cicatriz fina no polegar.",
    relationships: { Dora: "Neutral", Elias: "Suspeito" },
    worldState: {
      location: "Loja Relíquias & Restos, beco de mercado mágico secundário",
      npcs: {
        Dora: "proprietária; elegante e impaciente; loja; exige discrição",
        Elias: "cliente; fala demais, ajusta gravata; vitrine; reivindica o objeto",
      },
    },
    plots: [{ title: "Cartas que voltam", hook: "Um objeto responde cartas nunca enviadas — e uma delas aponta para Clara." }],
    specialAbility: power(
      "Eco de Tinta",
      "Ao tocar um papel ou objeto marcado com tinta mágica, você vê por um instante a emoção de quem escreveu por último — medo, raiva, urgência — sem ler a mente completa.",
      "Uma visão curta por objeto. Cansaço ocular e dor de cabeça se repetido. Mentiras deliberadas na tinta confundem o eco.",
      true
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "star-wars",
    world: "Star Wars",
    charName: "Taren Voss",
    charTitle: "Mecânico do Porto Cinza",
    charAge: "29",
    genre: "Fronteira espacial",
    hook: "Um conserto barato revela alguém vivo escondido no casco — e o Império (ou quem o imita) já pergunta pelo navio.",
    charBg:
      "Devedor de Nemi, sobrevive de reparos num porto distante do Núcleo. Já viu demais para acreditar em heróis; ainda assim não entrega gente ferida. Quer a oficina limpa de dívidas, não uma rebelião.",
    charPersonality:
      "Prático, irônico, desconfiado de uniformes. Incapaz de abandonar um ferido — e odeia isso em si mesmo. Quando mente, limpa as mãos no pano mesmo limpas. Medo: a dívida virar coleira para sempre.",
    charSkills: "Mecânica de cargueiros, leitura de painéis, solda, pilotagem básica. Sem treino de Força.",
    supportingCast:
      "Nemi — fornecedora; cobra peças com sorriso doce e prazo cruel; sabe de todos os segredos do porto. Capitão Dreel — dono do cargueiro; voz militar sem patente clara; insiste que o compartimento não seja aberto; tique: aperta o comlink sem transmitir.",
    storyStartPoint:
      "No hangar sujo do Porto Cinza, o painel do casco aquece no ombro enquanto o último parafuso aperta. Três batidas vêm de um compartimento sem registro — ritmadas, humanas. Dreel já está no corredor. Nemi, pelo comlink aberto na bancada: \"Taren, se esse navio atrasa, a dívida dobra.\" Dreel: \"Não abre. Ordem. Você ouviu.\"",
    narration: { style: "cinematic", length: "balanced", pace: "balanced" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Macacão manchado de óleo, cicatriz de solda no antebraço, ferramenta no cinto.",
    relationships: { Nemi: "Neutral", "Capitão Dreel": "Suspeito" },
    worldState: {
      location: "Hangar 7, Porto Cinza",
      npcs: {
        Nemi: "fornecedora; sorriso doce, prazo cruel; porto; cobra peças",
        "Capitão Dreel": "capitão; voz militar, aperta comlink; corredor; proíbe abrir o casco",
      },
    },
    plots: [{ title: "Passageiro no casco", hook: "Alguém vivo bate de dentro do navio — abrir é crime, fechar é sentença." }],
    specialAbility: power(
      "Diagnóstico Fantasma",
      "Por instantes você 'sente' falhas em circuitos e pressão de casco como se o navio murmurasse. Encontra compartimentos ocultos e sabotagens recentes.",
      "Requer contato ou scanner ligado. Em tiroteio a concentração quebra. Não lê intenções de pessoas — só máquinas e estruturas.",
      true
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "witcher",
    world: "The Witcher",
    charName: "Mila dos Juncos",
    charTitle: "Ajudante da bungalow de Ada",
    charAge: "27",
    genre: "Fantasia sombria",
    hook: "A doença da aldeia segue a rota de um comerciante — e a água da fonte brilha errado.",
    charBg:
      "Humana comum, aprendeu ervas com Ada nas margens pantanosas. Não é bruxa, não é bruxo. Os vizinhos a chamam quando a tosse começa; ela já enterrou amigos demais para fingir esperança barata.",
    charPersonality:
      "Paciente com doentes, cética com milagres, protetora até a teimosia. Fala pouco; quando raiva sobe, conta ingredientes em voz alta. Segredo: roubou um frasco raro de Ada e ainda não confessou.",
    charSkills: "Herbalismo, curativos, trilhas do pântano, negociação de raízes. Sem Sinais nem mutações.",
    supportingCast:
      "Ada — mentora; voz rouca, mãos manchadas de verde, ama a verdade mais que a paz; pede que você ache a origem da água turva. Oren — moleiro; esconde compra, ri alto demais, evita a fonte; tique: limpa farinha da barba quando mente.",
    storyStartPoint:
      "Você ainda está descalça no limiar da bungalow quando o frasco frio toca a palma — a criança já correu. A água brilha no escuro da cozinha, cheiro da fonte da aldeia dos Juncos. Do outro lado da rua, a tosse não cessa. Ada: \"Não é febre comum. Segue o caminho do comerciante.\" Oren, na porta, com saco de farinha: \"Não tem nada na fonte. Vocês assustam o povo.\"",
    narration: { style: "dark", length: "balanced", pace: "balanced" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Avental manchado, unhas verdes de seiva, cordão com dente de peixe seco.",
    relationships: { Ada: "Amigável", Oren: "Suspeito" },
    worldState: {
      location: "Aldeia dos Juncos, bungalow de Ada",
      npcs: {
        Ada: "mentora; voz rouca, verdade acima da paz; bungalow; pede investigar a fonte",
        Oren: "moleiro; ri alto, limpa farinha da barba; rua; nega problema na fonte",
      },
    },
    plots: [{ title: "Água que brilha", hook: "A doença segue a rota de um comerciante; a fonte brilha e Oren mente." }],
    specialAbility: power(
      "Nariz de Podridão",
      "Você detecta toxinas, mofo mágico e sangue velho pelo cheiro a metros de distância — útil em feitiços baratos e venenos de mercador.",
      "Sobrecarga causa náusea e perda de olfato por horas. Não identifica o autor, só a presença da substância.",
      true
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "skyrim",
    world: "Skyrim",
    charName: "Edda Freixo",
    charTitle: "Carregadora da Caravana do Pinheiro Quebrado",
    charAge: "25",
    genre: "Estradas e ruínas",
    hook: "A caravana sumiu — as mercadorias ficaram. O livro de entregas ainda está quente.",
    charBg:
      "Viaja por wage e envia moedas à família no norte. Não é Dragonborn, não é jarl. Já enterrou um amigo em nevasca e jurou não deixar outro para trás — promessa que dói.",
    charPersonality:
      "Resistente, franca, cautelosa com juramentos. Humor seco. Quando tem medo, conta passos. Medo secreto: a família descobrir que ela já matou em legítima defesa e gostou do silêncio depois.",
    charSkills: "Acampar, rastrear carroças, machado de trabalho, cuidar de animais de carga. Sem Thu'um.",
    supportingCast:
      "Rurik — chefe da caravana; oferece ouro pelo livro de entregas, voz de quem já perdeu gente; olha demais para o horizonte. Sela — outra carregadora; quer desistir, treme nas mãos, leal a Edda; tique: aperta o amuleto de Talos quando mente para si mesma.",
    storyStartPoint:
      "O vento da Pale corta as mangas quando você alcança as carroças da Caravana do Pinheiro Quebrado — intactas, rédeas presas. O caldo na panela ainda aquece os dedos. Sela puxa seu braço. Rurik aponta o livro aberto no banco. Sela: \"Edda, a gente some. Agora.\" Rurik: \"O livro vale mais que a sua vida. Traga — ou alguém menos paciente vem buscar.\"",
    narration: { style: "epic", length: "balanced", pace: "balanced" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Peles remendadas, cicatriz de corda no ombro, machado curto no cinto.",
    relationships: { Rurik: "Neutral", Sela: "Amigável" },
    worldState: {
      location: "Acampamento abandonado na Pale",
      npcs: {
        Rurik: "chefe; voz dura, olha o horizonte; acampamento; quer o livro",
        Sela: "carregadora; treme, aperta amuleto; acampamento; quer fugir",
      },
    },
    plots: [{ title: "Caravana fantasma", hook: "Mercadorias intactas, gente sumida — o livro de entregas ainda espera uma assinatura." }],
    specialAbility: power(
      "Passo na Neve",
      "Por um curto trecho você deixa rastros mínimos na neve e ouve o vento 'apontar' movimento próximo — emboscada ou presa.",
      "Só funciona em neve/gelo. Cansa as pernas. Em combate aberto o efeito some.",
      true
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "pokemon",
    world: "Pokémon",
    charName: "Nico Prado",
    charTitle: "Auxiliar do Abrigo Ribanceira",
    charAge: "20",
    genre: "Exploração e amizade",
    hook: "Os Pokémon do abrigo recusam a ponte — e uma mochila balança sob as pedras.",
    charBg:
      "Cuida de resgatados e faz entregas curtas na região. Não é campeão, não tem laboratório. Seu parceiro é um Pokémon comum que confia nele mais do que Nico confia em si.",
    charPersonality:
      "Gentil até se prejudicar; persistente; curioso com sons estranhos. Foge de briga de treinadores famosos. Quando mente, oferece comida. Segredo: já libertou um Pokémon 'perigoso' contra a ordem de Bia.",
    charSkills: "Cuidados básicos, leitura de comportamento, orientação local. Parceiro comum sem habilidade lendária.",
    supportingCast:
      "Bia — responsável do abrigo; firme, justa, esconde cansaço; pede que ache a cuidadora atrasada. Davi — morador; ouviu barulho sob a ponte, exagera histórias, quer atenção; tique: bate o pé no ritmo da água.",
    storyStartPoint:
      "A correia estica no pulso na entrada da Ponte Ribanceira — seu parceiro recusa o primeiro degrau. Cheiro de rio. Entre as pedras, uma mochila balança. A água se mexeu. Bia, pelo comunicador: \"Nico, a cuidadora não chegou. Não atravessa se eles recusam.\" Davi, na margem: \"Tem coisa embaixo. Eu ouvi. Você vai ver.\"",
    narration: { style: "light", length: "balanced", pace: "balanced" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Colete do abrigo, joelho ralado, pokébola comum no cinto.",
    relationships: { Bia: "Amigável", Davi: "Neutral" },
    worldState: {
      location: "Ponte Ribanceira, perto do abrigo",
      npcs: {
        Bia: "responsável; firme e cansada; abrigo; pede achar cuidadora",
        Davi: "morador; exagera, bate o pé; margem; ouviu barulho",
      },
    },
    plots: [{ title: "A ponte que recusa", hook: "Pokémon não atravessam; uma mochila e um barulho pedem resposta." }],
    specialAbility: power(
      "Elo Quieto",
      "Com o parceiro próximo, você sente emoções básicas dele (medo, fome, alerta) e pode pedir um movimento simples sem comando gritante.",
      "Só com o parceiro vinculado. Em pânico extremo o elo corta. Não controla Pokémon selvagens.",
      false
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "westeros",
    world: "Westeros — Crônicas de Gelo e Fogo",
    charName: "Tomás Reedle",
    charTitle: "Ajudante da Estalagem do Cervo Molhado",
    charAge: "22",
    genre: "Intriga e sobrevivência",
    hook: "Dois grupos querem a mesma bolsa — e mentir pode matar mais rápido que a verdade.",
    charBg:
      "Filho de trabalhadores, serve mesas e cuida de cavalos numa estrada secundária das Terras Fluviais. Sem título, sem espada de nome. Já ouviu demais para ser inocente; ainda não o bastante para ser cruel.",
    charPersonality:
      "Discreto, pragmático, dividido entre salário e lealdade. Observa bocas, não olhos. Quando mente, limpa canecas. Medo: escolher o lado errado e a estalagem queimar com Mara dentro.",
    charSkills: "Cavalos, escuta de taverna, cozinha simples, caminhos locais. Sem treino de cavaleiro.",
    supportingCast:
      "Mara — estalajadeira; quer paz e lucro, voz baixa quando ameaça; trata Tomás quase como filho e quase como empregado. Ivo — cocheiro; oferece o dobro do salário para esconder a bolsa; tique: cospe à esquerda antes de mentir.",
    storyStartPoint:
      "Na Estalagem do Cervo Molhado, a bolsa ainda está quente do ombro de quem a deixou quando Ivo a empurra contra o seu peito, no corredor fechado. Cheiro de cerveja azeda e palha. Do pátio, duas vozes pedem o mesmo hóspede. Ivo: \"O dobro do mês. Você não viu nada.\" Mara, da cozinha, sem abrir a porta: \"Tomás. Se trouxer guerra para a minha casa, eu te jogo na estrada.\"",
    narration: { style: "intimate", length: "balanced", pace: "balanced" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Avental manchado, unhas de estábulo, olheiras de turno longo.",
    relationships: { Mara: "Amigável", Ivo: "Suspeito" },
    worldState: {
      location: "Estalagem do Cervo Molhado, estrada das Terras Fluviais",
      npcs: {
        Mara: "estalajadeira; voz baixa quando ameaça; cozinha; quer paz",
        Ivo: "cocheiro; cospe à esquerda; corredor; oferece ouro pela mentira",
      },
    },
    plots: [{ title: "A bolsa do hóspede", hook: "Dois grupos pedem a mesma bolsa; Mara quer paz e Ivo paga silêncio." }],
    specialAbility: power(
      "Ouvido de Taverna",
      "Em lugares barulhentos você isola uma conversa a poucos metros — nomes, números, medo — como se o resto fosse água.",
      "Exige concentração e linha de visão parcial. Em combate ou música alta demais falha. Não funciona no campo aberto silencioso.",
      true
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "bleach",
    world: "Bleach",
    charName: "Sora Hane",
    charTitle: "Estudante noturno e faxineiro do Hospital Karakura Leste",
    charAge: "19",
    genre: "Espíritos e limiar",
    hook: "Os corredores do hospital engolem sons — e um espírito pede que você não chame os de sempre.",
    charBg:
      "Humano comum de Karakura, limpa turnos da madrugada para pagar o curso. Já viu vultos demais para duvidar; ainda assim mente para os médicos. Não é shinigami.",
    charPersonality:
      "Quieto, teimoso, humor negro. Protege pacientes como se fossem família. Quando mente, conta azulejos. Segredo: já ajudou um espírito a 'passar' sem testemunha e não sabe se fez o certo.",
    charSkills: "Primeiros socorros, corrida em corredor, discrição, leitura de medo em rostos. Sem zanpakutō.",
    supportingCast:
      "Enfermeira Rika — pragmática, fuma no terraço, desconfia de Sora; tique: aperta o crachá. Plus fragmentado — voz de criança, pede silêncio, medo de 'os de uniforme preto'.",
    storyStartPoint:
      "O corredor do Hospital Karakura Leste cheira a antisséptico frio. A luz pisca. Um som some no meio da frase de um monitor. Rika: \"Hane. Se estiver vendo coisa de novo, não mistura paciente.\" A voz fina, à sua esquerda, sem corpo claro: \"Não chama eles. Se chamar, eu sumo errado.\"",
    narration: { style: "dark", length: "balanced", pace: "balanced" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Uniforme de faxina, fones no pescoço, mãos rachadas de álcool.",
    relationships: { Rika: "Neutral" },
    worldState: {
      location: "Hospital Karakura Leste, corredor 3",
      npcs: {
        Rika: "enfermeira; pragmática, aperta crachá; terraço/corredor; desconfia",
      },
    },
    plots: [{ title: "Corredor que engole som", hook: "Um espírito pede silêncio; chamar shinigami pode ser sentença." }],
    specialAbility: power(
      "Véu Baixo",
      "Por poucos segundos você enxerga contornos de espíritos fracos e deixa um objeto 'opaco' ao olhar espiritual casual — o suficiente para esconder um plus assustado.",
      "Sangramento nasal se usado mais de uma vez por noite. Shinigamis experientes podem perceber. Não fere Hollows.",
      true
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "jujutsu",
    world: "Jujutsu Kaisen",
    charName: "Hana Mori",
    charTitle: "Estagiária de arquivo da Prefeitura Espiritual Secundária",
    charAge: "20",
    genre: "Maldição urbana",
    hook: "Um dossiê marcado como 'arquivado' ainda lateja — e a maldição dentro dele conhece o seu nome.",
    charBg:
      "Civil contratada para digitalizar relatórios. Sem escola de feiticeiros. Aprendeu a não olhar demais para manchas nas paredes. Quer promoção e também quer sair viva.",
    charPersonality:
      "Meticulosa, ansiosa, corajosa em picos curtos. Faz listas para não pirar. Quando mente, bebe água. Segredo: abriu um dossiê selado por curiosidade e agora a maldição 'responde'.",
    charSkills: "Arquivo, pesquisa, corrida urbana, discrição. Sem técnica inata formal.",
    supportingCast:
      "Supervisor Ken — frio, correto, esconde pânico sob protocolo; quer o dossiê fechado. Maldição do Arquivo — voz de papel amassado; chama Hana pelo nome; tique: farfalhar sem vento.",
    storyStartPoint:
      "No porão da Prefeitura Espiritual Secundária, o arquivo cheira a poeira e ozônio. O dossiê marcado ARCHIVED lateja na mão. Ken: \"Mori. Isso não existe no sistema. Fecha e esquece.\" O farfalhar, sem boca: \"Hana. Você já leu a primeira linha. Termina.\"",
    narration: { style: "dark", length: "balanced", pace: "fast" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Crachá torto, adesivos no notebook, olheiras de turno.",
    relationships: { Ken: "Neutral" },
    worldState: {
      location: "Arquivo subterrâneo da Prefeitura Espiritual Secundária",
      npcs: {
        Ken: "supervisor; frio, protocolo; arquivo; quer fechar o dossiê",
      },
    },
    plots: [{ title: "Dossiê que lateja", hook: "Um arquivo 'morto' conhece o nome de Hana e Ken quer silêncio." }],
    specialAbility: power(
      "Margem Anotada",
      "Você pode marcar uma frase num papel com energia residual fraca: por um minuto a maldição fraca hesita em cruzar aquela linha como se fosse um selo barato.",
      "Uma marca por cena. Papel queima nas bordas. Contra maldições fortes é só atraso, não barreira.",
      true
    ),
    gameStyle: "acao",
    useImages: true,
  },
  {
    id: "attack-on-titan",
    world: "Attack on Titan",
    charName: "Piet Orso",
    charTitle: "Aprendiz de manutenção das muralhas — distrito de Trost externo",
    charAge: "18",
    genre: "Cerco e medo",
    hook: "Uma rachadura nova na parede interna não está no relatório — e alguém paga para você calar.",
    charBg:
      "Órfão de distrito exterior, sobe andaimes com cinto velho. Não é soldado. Odeia discursos de glória; ama a ideia de um dia viver sem ouvir o chão tremer.",
    charPersonality:
      "Teimoso, sarcástico, leal a quem compartilha pão. Congela quando ouve trombetas. Quando mente, aperta a fivela do cinto. Segredo: já viu uma rachadura 'respirar' e não contou.",
    charSkills: "Cordas, andaime, leitura de rachaduras, corrida em telhado. Sem DMT.",
    supportingCast:
      "Sargento Vale — disciplina seca, esconde medo com ordens; quer o relatório limpo. Mira — vendedora do mercado; oferece moedas pelo silêncio; tique: olha sempre para o céu da muralha.",
    storyStartPoint:
      "No andaime da muralha interna de Trost, o vento corta o rosto. Seus dedos acham uma rachadura nova — úmida, errada, fora do relatório. Vale, no patamar: \"Orso. Se não está no papel, não existe. Desce.\" Mira, lá embaixo, ergue um saquinho: \"Você não viu nada. Tem gente que paga melhor que a guarnição.\"",
    narration: { style: "cinematic", length: "balanced", pace: "fast" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Cinto de manutenção remendado, joelheiras, pó de pedra no cabelo.",
    relationships: { "Sargento Vale": "Neutral", Mira: "Suspeito" },
    worldState: {
      location: "Andaime da muralha interna, Trost",
      npcs: {
        "Sargento Vale": "sargento; ordens secas; patamar; quer relatório limpo",
        Mira: "vendedora; olha o céu da muralha; mercado; oferece silêncio pago",
      },
    },
    plots: [{ title: "Rachadura fora do papel", hook: "A muralha respira errado; Vale nega e Mira compra silêncio." }],
    specialAbility: power(
      "Pele de Pedra",
      "Por segundos você sente vibração na muralha: direção de impacto, oco perigoso, se algo grande se moveu do outro lado.",
      "Só em contato com pedra da muralha. Enxaqueca depois. Não prevê o futuro — só vibração recente.",
      true
    ),
    gameStyle: "acao",
    useImages: true,
  },
  {
    id: "lotr",
    world: "O Senhor dos Anéis",
    charName: "Bram Folhacinza",
    charTitle: "Mensageiro de aluguel entre vilarejos do Condado oriental",
    charAge: "26",
    genre: "Estrada e sombra",
    hook: "Uma carta lacrada com cera estranha não deve chegar — e três caminhos pedem preços diferentes.",
    charBg:
      "Hobbit de família modesta, leva cartas e encomendas. Não é aventureiro de canção. Já viu um cavaleiro negro longe demais na névoa e ainda sonha com o som dos cascos.",
    charPersonality:
      "Educado, teimoso, fome emocional por lareira segura. Conta piadas ruins quando nervoso. Segredo: abriu uma carta uma vez e o conteúdo ainda o persigue.",
    charSkills: "Caminhos do Condado, discrição, barganha, corrida em sebes. Sem magia.",
    supportingCast:
      "Tia Nessa — quer que Bram devolva a carta e fique; voz doce, medo real. Estranho do manto cinza — paga o dobro para a carta seguir oeste; fala pouco; tique: não deixa a sombra cair no rosto.",
    storyStartPoint:
      "Na bifurcação do caminho do Salgueiro Velho, a carta queima leve no bolso interno — cera estranha, selo que não é do correio. Nessa segura seu braço. O estranho do manto espera no entroncamento. Nessa: \"Devolve isso, Bram. Cartas assim comem lareiras.\" O estranho: \"Oeste. Antes do anoitecer. Pago o dobro — e o silêncio.\"",
    narration: { style: "literary", length: "balanced", pace: "slow" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Colete remendado, pés duros de estrada, carta no forro.",
    relationships: { "Tia Nessa": "Amigável", "Estranho do manto": "Suspeito" },
    worldState: {
      location: "Bifurcação do Salgueiro Velho, Condado oriental",
      npcs: {
        "Tia Nessa": "tia; voz doce, medo; caminho; quer devolver a carta",
        "Estranho do manto": "viajante; fala pouco, esconde o rosto; entroncamento; paga o oeste",
      },
    },
    plots: [{ title: "Carta de cera estranha", hook: "Entregar, devolver ou vender o silêncio — três preços, uma sombra." }],
    specialAbility: power(
      "Pé Quieto",
      "Em grama, folhiço ou estrada de terra você se move quase sem som e nota quando alguém o segue pelo 'erro' no silêncio.",
      "Em pedra, taverna ou chuva forte falha. Corrida longa cansa mais que o normal.",
      true
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "avatar",
    world: "Avatar: A Lenda de Aang",
    charName: "Kiri de Yu Dao",
    charTitle: "Aprendiz de forja mista na fronteira",
    charAge: "17",
    genre: "Nação e identidade",
    hook: "Um pedido de arma 'só para defesa' esconde um símbolo proibido — e os dois lados da cidade querem sua escolha.",
    charBg:
      "Filha de mãe da Nação do Fogo e pai da Terra, cresceu em Yu Dao ouvindo que misturar era problema. Dobra metal e não dobra opinião. Sem ser Dobradora poderosa — o fogo nela é pequeno e teimoso.",
    charPersonality:
      "Orgulhosa, justa, explosiva sob insulto. Protege aprendizes mais novos. Quando mente, bebe chá frio. Segredo: já usou fogo em briga de rua e fingiu que foi tocha.",
    charSkills: "Forja, leitura de ligas, briga de oficina, diplomacia ríspida. Dobra de fogo mínima e instável.",
    supportingCast:
      "Mestre Han — quer a forja neutra; voz cansada, justiça antiga. Lin — emissária; pede a lâmina com símbolo; sorriso político; tique: alisa a luva esquerda.",
    storyStartPoint:
      "Na forja mista de Yu Dao, o metal ainda chia quando Lin desenrola o desenho: um símbolo que a cidade jurou esquecer. Han limpa a garganta. Han: \"Kiri. Se isso sair daqui, a forja fecha.\" Lin: \"É defesa. Só defesa. Sua mãe entenderia — ou você escolhe o lado errado da rua?\"",
    narration: { style: "epic", length: "balanced", pace: "balanced" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Avental de couro, faísca antiga na sobrancelha, pulseira das duas nações.",
    relationships: { "Mestre Han": "Amigável", Lin: "Suspeito" },
    worldState: {
      location: "Forja mista, Yu Dao",
      npcs: {
        "Mestre Han": "mestre; voz cansada; forja; quer neutralidade",
        Lin: "emissária; sorriso político, alisa luva; forja; pede a lâmina",
      },
    },
    plots: [{ title: "Símbolo na lâmina", hook: "Forjar é escolher lado; Han quer paz e Lin paga o conflito." }],
    specialAbility: power(
      "Faísca Curta",
      "Você produz uma faísca ou chama pequena o bastante para aquecer metal, cegar por um instante ou acender pavio — não um jato de guerra.",
      "Cansaço e queimadura nas mãos se abusado. Em chuva forte falha. Não compete com Dobradores treinados em duelo.",
      true
    ),
    gameStyle: "aventura",
    useImages: true,
  },
  {
    id: "demon-slayer",
    world: "Demon Slayer",
    charName: "Yuto Kabe",
    charTitle: "Carregador de carvão na rota da Montanha da Pinça",
    charAge: "16",
    genre: "Noite e lâmina",
    hook: "O caminho do carvão cheira a sangue doce — e a irmã mais nova não voltou do córrego.",
    charBg:
      "Humano sem respiração de espadachim. Carrega carvão para a família. Ouviu histórias de demônios como quem ouve trovão: longe, até chegar perto.",
    charPersonality:
      "Protetor, impulsivo, teimoso. Chora depois, nunca na frente. Quando mente, aperta a alça do cesto. Segredo: já viu olhos vermelhos no bosque e correu — e odeia isso.",
    charSkills: "Trilha noturna, carga pesada, faca de utilidade, reconhecimento de cheiros da floresta. Sem respiração formal.",
    supportingCast:
      "Emi — irmã; desaparecida no córrego; voz que Yuto ainda ouve na cabeça. Caçador Saburo — oferece ajuda com preço; cicatriz no pescoço; tique: conta os dentes da espada curta.",
    storyStartPoint:
      "Na trilha da Montanha da Pinça, o cesto de carvão corta o ombro. O ar doce demais — sangue. O córrego onde Emi foi buscar água está quieto demais. Saburo surge do bambu. Saburo: \"Menino. Se for demônio, você morre gritando. Eu corto — por um preço.\" Do córrego, um barulho: pedra molhada, passo leve demais para gente cansada.",
    narration: { style: "dark", length: "balanced", pace: "fast" },
    isKnownIP: true,
    isExistingChar: false,
    ordinaryCharacter: true,
    worldBg: WORLD_NOTE,
    charLore: "",
    charAppearanceNote: "Cesto de carvão, faixas nos pulsos, faca curta no cinto.",
    relationships: { Saburo: "Suspeito" },
    worldState: {
      location: "Trilha da Montanha da Pinça, perto do córrego",
      npcs: {
        Saburo: "caçador; cicatriz, conta dentes da espada; bambu; oferece ajuda paga",
      },
    },
    plots: [{ title: "Córrego doce demais", hook: "Emi sumiu; o cheiro é sangue e Saburo vende sobrevivência." }],
    specialAbility: power(
      "Fôlego de Pânico",
      "Em perigo mortal você corre e salta além do normal por alguns segundos — corpo de desespero, não de técnica.",
      "Depois vem colapso: tremores e vômito. Não corta pescoço de demônio. Não substitui treino de respiração.",
      true
    ),
    gameStyle: "acao",
    useImages: true,
  },
];
