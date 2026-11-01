// Histórias prontas — elenco inventado, poderes com limite, verdade escondida para o Mestre.
// Cada história tem: 3 tramas (principal, pessoal, paralela), 3 vozes no elenco e gmBrief
// (verdade, pistas, relógio de escalada, virada e agendas). gmBrief só entra no prompt do Mestre.
const power = (name, description, limits, secret = true) => ({
  enabled: true,
  name,
  description,
  limits,
  secret,
});

const WORLD_NOTE =
  "Aventura original paralela, sem data canônica específica. Permaneça na física, nos lugares e no sistema de poder deste mundo; não atribua estes acontecimentos à obra oficial. O jogador não substitui protagonistas canônicos.";

const ORIGINAL_NOTE = (desc) =>
  `Mundo original desta mesa. ${desc} Invente detalhes locais coerentes com isto; não puxe elementos de obras conhecidas.`;

const plot = (title, hook) => ({ title, hook });

const base = (extra) => ({
  isKnownIP: true,
  isExistingChar: false,
  ordinaryCharacter: true,
  worldBg: WORLD_NOTE,
  charLore: "",
  gameStyle: "aventura",
  useImages: true,
  ...extra,
});

export const ADVENTURE_PRESETS = [
  // ── Universos conhecidos ────────────────────────────────────────────
  base({
    id: "naruto",
    world: "Naruto",
    charName: "Ren Aoki",
    charTitle: "Corredor de encomendas da Vila do Vale Nebuloso",
    charAge: "21",
    genre: "Mistério ninja",
    hook: "Um pacote sem destinatário respira no seu colo. Sua patroa, um mercenário e seu antigo parceiro querem ele — por motivos que não batem.",
    charBg:
      "Filho de comerciantes de estrada, cresceu entre postos de pedágio e atalhos de floresta. Nunca entrou numa academia ninja; aprendeu a sumir com pacotes e a ler o medo no rosto de quem entrega. Deve dinheiro a Mika e sonha em comprar um nome limpo. Há dois anos largou o parceiro Juro para trás num assalto que deu errado.",
    charPersonality:
      "Observador até o ponto da paranoia; leal a quem lhe deu pão, mas mente por proteção. Odeia violência barulhenta, ri nervoso quando mente, e guarda a culpa de ter abandonado Juro. Quer parecer útil — tem medo de ser descartável.",
    charSkills:
      "Orientação noturna, corrida de resistência, esconder volumes, primeiros socorros rústicos, leitura de posturas. Sem jutsus de clã.",
    supportingCast:
      "Mika — estalajadeira; seca, conta moedas em voz alta, esconde afeto atrás de cobrança; tem cicatrizes de selo nas palmas que nunca explica. Kaji — viajante de capa úmida; fala baixo demais, pergunta o preço do pacote como quem já sabe o conteúdo; tique: limpa a unha com a faca na bota. Juro — ex-parceiro de Ren; sorriso torto, manca da perna que quebrou no assalto; agora anda com Kaji e chama Ren de 'sócio' com veneno.",
    storyStartPoint:
      `A poeira da estrada da Vila do Vale Nebuloso entra na boca quando a carroça trava na saída do portão de madeira. O pacote sem selo lateja quente no colo — chakra fraco, ritmado, como um animal dormindo. Kaji já está junto da roda, perto demais, mão aberta. Atrás dele, mancando, alguém que você deixou para trás há dois anos. Mika: "Ren. Se entregar isso errado, não volta para a minha mesa." Kaji: "O preço que ela te pagou é esmola. Me dá o volume e você some vivo." Juro: "Oi, sócio. Dessa vez você não corre sozinho."`,
    narration: { style: "cinematic", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Mãos calejadas, tornozeleira de corda, jaqueta com bolsos costurados por dentro.",
    relationships: { Mika: "Amigável", Kaji: "Suspeito", Juro: "Hostil" },
    worldState: {
      location: "Portão sul da Vila do Vale Nebuloso",
      npcs: {
        Mika: "estalajadeira; seca e protetora, cicatrizes de selo nas palmas; Vale Nebuloso; confiou a encomenda",
        Kaji: "viajante; fala baixa, limpa a faca na bota; estrada; quer o pacote",
        Juro: "ex-parceiro; manca, sorriso torto; anda com Kaji; ressentido com Ren",
      },
    },
    plots: [
      plot("O pacote sem nome", "Um volume que respira chakra puxa Mika, Kaji e Juro em direções opostas — e ninguém diz o que tem dentro."),
      plot("Dívida e nome limpo", "Ren deve a Mika; entregar certo pode quitar tudo, ou provar que ele sempre foi só um mensageiro descartável."),
      plot("O parceiro deixado para trás", "Juro voltou com Kaji. Ren pode pagar a culpa daquele assalto — ou repetir a fuga."),
    ],
    gmBrief: {
      truth:
        "O pacote é um ovo selado de invocação — filhote de uma linhagem de corvos mensageiros que se achava extinta. Mika foi kunoichi desertora; anos atrás roubou o ovo do bando mercenário Lua Rachada para que não fosse vendido a um senhor feudal. Agora o selo está enfraquecendo e ela mandou Ren entregar a uma médica de vila vizinha, Sayo, que sabe chocar o ovo. Kaji lidera o que sobrou do Lua Rachada. Juro entrou no bando porque ninguém mais o aceitou depois da perna quebrada.",
      clues: [
        "O pulso do pacote acompanha uma respiração; perto de corvos comuns ele acelera.",
        "A faca de Kaji tem gravada uma lua partida ao meio — insígnia de um bando dissolvido.",
        "As cicatrizes nas palmas de Mika são de selos de contenção, típicos de ninjas de vila.",
        "Sayo, a médica destinatária, tem um poleiro vazio e penas negras guardadas numa caixa.",
      ],
      escalation: [
        "Kaji deixa Ren seguir, mas Juro e mais dois mercenários vão atrás pela floresta.",
        "O ovo racha: picos de chakra atraem uma patrulha de chūnin da vila vizinha, que confisca tudo o que acha suspeito.",
        "O filhote nasce e se vincula a quem estiver mais perto. Kaji passa a querer essa pessoa, não só o ovo.",
      ],
      twist: "Mika e Kaji foram parceiros — e amantes — no Lua Rachada. Ele não quer só o dinheiro: quer que ela volte, e usa Ren como isca.",
      agendas: {
        Mika: "proteger o ovo sem se expor como desertora; gosta de Ren mais do que admite",
        Kaji: "recuperar o ovo e, através dele, Mika",
        Juro: "dinheiro para tratar a perna; no fundo, quer que Ren peça desculpas",
      },
    },
    specialAbility: power(
      "Selo de Esconderijo",
      "Você pode marcar um objeto pequeno com um selo rudimentar: por alguns minutos ele parece vazio de chakra e mais leve aos sentidos. Não some de verdade — só engana a percepção.",
      "Uma vez por cena; cansaço e sangramento no nariz se forçado. Não esconde pessoas vivas. Ninjas treinados podem desconfiar se olharem de perto."
    ),
  }),
  base({
    id: "one-piece",
    world: "One Piece",
    charName: "Lia Maré",
    charTitle: "Aprendiz de carpinteira no Estaleiro Maré Baixa",
    charAge: "23",
    genre: "Mar e liberdade",
    hook: "Um barco chega sozinho ao cais com um pedido de socorro escondido no casco. Ao amanhecer, ele vira lenha — junto com a única pista.",
    charBg:
      "Órfã de um porto secundário da East Blue, cresceu medindo tábuas e ouvindo histórias da Grand Line que ninguém daqui chega a ver. Bento a tirou da rua; ela odeia dever favores e ainda assim deve a vida a ele. Sonha com um navio próprio, não com fama.",
    charPersonality:
      "Inventiva e teimosa; generosa com quem tem fome, dura com quem manda sem sujar as mãos. Fala com as mãos (desenha no ar). Quando mente, assobia fora do tom. Medo secreto: ser deixada em terra enquanto o mundo segue.",
    charSkills: "Reparo de casco, nós, natação, ferramentas, cheiro de madeira podre vs. boa. Sem Akuma no Mi.",
    supportingCast:
      "Bento — patrão do estaleiro; voz grossa, humor cruel, protege a oficina como um filho; quer desmontar o barco antes do amanhecer. Iara — pescadora; reconhece o casco, fala em metáforas de maré, evita olhar nos olhos; tique: enrola a rede nos pulsos quando mente. Russo — agiota do porto; terno branco com manchas de sal, ri antes de ameaçar; aparece sempre que Bento fica nervoso.",
    storyStartPoint:
      `A água da East Blue sobe gelada pelos tornozelos no Estaleiro Maré Baixa. Você está ajoelhada no casco abandonado que Bento quer virar lenha até o alvorecer. Sob a tábua solta, os dedos acham papel úmido: um pedido de ajuda, tinta ainda vermelha nas bordas, e um desenho de ilha que não está em mapa nenhum. Bento: "Antes do sol, isso vira tábua. Sem drama." Iara, na beira do cais: "Esse barco é do meu irmão. Ele saiu há um mês e não voltou."`,
    narration: { style: "light", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Farrapos de sal, óculos improvisados na testa, lascas de madeira nos cabelos.",
    relationships: { Bento: "Amigável", Iara: "Neutral", Russo: "Suspeito" },
    worldState: {
      location: "Estaleiro Maré Baixa, porto secundário da East Blue",
      npcs: {
        Bento: "patrão; voz grossa, humor cruel; estaleiro; quer desmontar o barco",
        Iara: "pescadora; metáforas de maré, enrola rede nos pulsos; cais; o barco é do irmão dela",
        Russo: "agiota; terno branco manchado, ri antes de ameaçar; porto; cobra Bento",
      },
    },
    plots: [
      plot("O barco sem tripulação", "Um casco volta sozinho com um pedido de socorro e uma ilha fora do mapa. Desmontar é apagar a última pista."),
      plot("Um navio só meu", "Se Lia salvar e consertar o casco, ele pode ser o primeiro barco dela — se o dono não estiver morto."),
      plot("A dívida de Bento", "Russo cobra Bento com juros que crescem toda noite. Ninguém no estaleiro sabe o que ele comprou."),
    ],
    gmBrief: {
      truth:
        "O irmão de Iara, Caio, e sua tripulação de pescadores foram presos por um capitão-tenente da Marinha corrupto, Gaspar, que mantém uma pedreira clandestina numa ilhota fora das cartas e usa presos como mão de obra. Caio soltou o barco vazio na corrente com a mensagem escrita em tinta de lula. Russo é o testa de ferro de Gaspar no porto; mandou Bento destruir o casco em troca de perdoar parte da dívida.",
      clues: [
        "Os pregos novos no casco são de ferro da Marinha, com número de lote.",
        "No encaixe do mastro há um mapa riscado a faca: correntes, um rochedo em forma de dente.",
        "O livro de contas de Bento tem pagamentos a Russo desde o ano em que Lia chegou.",
        "Bêbados no porto falam de 'trabalho bem pago numa ilha' — ninguém que foi voltou.",
      ],
      escalation: [
        "Ao amanhecer, homens de Russo chegam para 'buscar a lenha' e reviram o estaleiro.",
        "Eles caçam quem ficou com a carta; Iara some de casa.",
        "Gaspar decide vender os presos para um navio negreiro — a pedreira será esvaziada em três dias.",
      ],
      twist: "A dívida de Bento existe porque, anos atrás, ele pagou a Russo para tirar o nome de Lia de uma lista de órfãos vendidos. Ele a protege do mesmo homem que agora quer o barco destruído.",
      agendas: {
        Bento: "manter Lia e o estaleiro vivos, nem que precise mentir para ela",
        Iara: "achar o irmão; não confia em ninguém que trabalhe para Bento",
        Russo: "apagar provas e manter Gaspar satisfeito",
      },
    },
    specialAbility: power(
      "Ouvido do Casco",
      "Ao tocar madeira de navio, você sente vibrações: rachaduras, peso escondido, se alguém esteve ali há pouco. Não lê mentes — só o 'corpo' do barco.",
      "Precisa de contato direto com as mãos. Em combate ou tempestade a sensação some. Não funciona em metal puro."
    ),
  }),
  base({
    id: "harry-potter",
    world: "Harry Potter",
    charName: "Clara Vale",
    charTitle: "Auxiliar da loja Relíquias & Restos",
    charAge: "24",
    genre: "Mistério mágico",
    hook: "Uma escrivaninha usada começa a escrever cartas que ninguém mandou. A letra é igual à da sua mãe — que morreu há três anos.",
    charBg:
      "Bruxa de formação mediana, sem sobrenome famoso. Cataloga objetos usados num beco lateral de um mercado mágico secundário. Dora a contratou porque Clara não faz perguntas em voz alta — até agora. A mãe, Helena, era aborto (squib) e trabalhava limpando casas de bruxos ricos.",
    charPersonality:
      "Curiosa demais para o próprio bem; cuidadosa com regras até achar uma falha. Evita confronto, mas anota tudo. Quando nervosa, organiza prateleiras. Segredo: já abriu um artefato proibido e mentiu no relatório.",
    charSkills: "Feitiços cotidianos, catalogação, observação, latim de etiqueta. Sem dons únicos de sangue.",
    supportingCast:
      "Dora — dona da loja; elegante, impaciente, protege o nome da casa; exige discrição absoluta e fica pálida quando ouve o nome Helena. Elias — cliente; afirma que o objeto é dele, fala demais, suor na testa; tique: ajusta uma gravata que não está usando. Inspetora Moira Fenn — fiscal de artefatos; educada, cansada, caneta de pena que anota sozinha; aparece justo quando algo dá errado.",
    storyStartPoint:
      `O cadeado de Relíquias & Restos ainda está frio na palma quando a gaveta lacrada da escrivaninha cede. Uma carta cai no seu colo: cheiro de fuligem, tinta recente, a letra redonda da sua mãe — e o endereço da sua casa. Do outro lado da vitrine, Elias não pisca. Dora, sem olhar: "Clara. Se isso vazar, você some do livro-caixa." Elias: "Esse móvel é meu. Entrega agora e ninguém precisa saber o que ele escreve."`,
    narration: { style: "literary", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Dedos manchados de tinta, avental com bolsos etiquetados, cicatriz fina no polegar.",
    relationships: { Dora: "Neutral", Elias: "Suspeito", "Moira Fenn": "Neutral" },
    worldState: {
      location: "Loja Relíquias & Restos, beco de mercado mágico secundário",
      npcs: {
        Dora: "proprietária; elegante e impaciente; loja; exige discrição, reage ao nome Helena",
        Elias: "cliente; fala demais, ajusta gravata inexistente; vitrine; reivindica a escrivaninha",
        "Moira Fenn": "fiscal de artefatos; educada e cansada, pena que anota sozinha; aparece em crises",
      },
    },
    plots: [
      plot("Cartas que voltam", "A escrivaninha escreve cartas nunca enviadas, com a letra da mãe de Clara. Uma delas aponta para a casa dela."),
      plot("O relatório falso", "Clara mentiu sobre um artefato proibido. Com a fiscalização rondando a loja, a mentira pode vir à tona."),
      plot("Quem era Helena", "A mãe de Clara limpava casas de bruxos ricos. Talvez tenha visto coisas demais."),
    ],
    gmBrief: {
      truth:
        "Helena, a mãe de Clara, juntava provas contra uma rede que vende objetos amaldiçoados a famílias ricas: anotava nomes, datas e entregas das casas onde limpava. Ela escondia as cartas na escrivaninha com um feitiço que a própria Dora lançou, e a escrivaninha 'devolve' as cartas a quem tem o sangue dela. Elias trabalha para a rede e quer os nomes. Helena morreu de uma 'doença súbita' — foi uma maldição.",
      clues: [
        "As cartas são cópias de cartas que Helena escreveu e nunca enviou; cada uma cita uma casa e um objeto.",
        "Dora tem no livro-caixa a compra da escrivaninha no leilão dos bens de Helena — feita por ela mesma.",
        "Elias tem uma queimadura em forma de anel na palma, igual à marca citada numa carta.",
        "O atestado de óbito de Helena foi assinado por um curandeiro que hoje mora numa casa grande demais.",
      ],
      escalation: [
        "Elias volta à noite com um 'advogado' de terno escuro e uma ordem falsificada de devolução.",
        "Alguém invade a casa de Clara e revira tudo atrás das cartas antigas.",
        "A rede denuncia Clara à fiscal Moira como receptadora de artefatos das trevas, usando a mentira antiga do relatório.",
      ],
      twist: "Dora era a melhor amiga de Helena e lançou o feitiço da escrivaninha. Contratou Clara para protegê-la de perto — e nunca teve coragem de contar.",
      agendas: {
        Dora: "proteger Clara sem admitir a culpa por não ter salvado Helena",
        Elias: "recuperar as cartas antes que os nomes cheguem à fiscalização; tem medo dos próprios chefes",
        "Moira Fenn": "fechar casos; é honesta, mas acredita em provas, e as provas podem ser forjadas",
      },
    },
    specialAbility: power(
      "Eco de Tinta",
      "Ao tocar um papel ou objeto marcado com tinta mágica, você vê por um instante a emoção de quem escreveu por último — medo, raiva, urgência — sem ler a mente completa.",
      "Uma visão curta por objeto. Cansaço ocular e dor de cabeça se repetido. Mentiras deliberadas na tinta confundem o eco."
    ),
  }),
  base({
    id: "star-wars",
    world: "Star Wars",
    charName: "Taren Voss",
    charTitle: "Mecânico do Porto Cinza",
    charAge: "29",
    genre: "Fronteira espacial",
    hook: "Três batidas vêm de um compartimento que não existe na planta do cargueiro. O capitão manda não abrir. A dívida manda não atrasar.",
    charBg:
      "Devedor de Nemi, sobrevive de reparos num porto distante do Núcleo. Já viu demais para acreditar em heróis; ainda assim não entrega gente ferida. Quer a oficina livre de dívidas, não uma rebelião.",
    charPersonality:
      "Prático, irônico, desconfiado de uniformes. Incapaz de abandonar um ferido — e odeia isso em si mesmo. Quando mente, limpa as mãos no pano mesmo limpas. Medo: a dívida virar coleira para sempre.",
    charSkills: "Mecânica de cargueiros, leitura de painéis, solda, pilotagem básica. Sem treino de Força.",
    supportingCast:
      "Nemi — fornecedora; cobra peças com sorriso doce e prazo cruel; sabe todos os segredos do porto. Capitão Dreel — dono do cargueiro; voz militar sem patente clara; insiste que o compartimento não seja aberto; tique: aperta o comlink sem transmitir. Kass Venn — caçadora de recompensas; armadura remendada com peças de três exércitos, bebe sempre a mesma coisa, educada demais.",
    storyStartPoint:
      `No hangar sujo do Porto Cinza, o painel do casco aquece no ombro enquanto o último parafuso aperta. Três batidas vêm de um compartimento sem registro — ritmadas, humanas. Depois, mais duas, fracas. Dreel já está no corredor. Nemi, pelo comlink aberto na bancada: "Taren, se esse navio atrasa, a dívida dobra." Dreel: "Não abre. Ordem. Você ouviu."`,
    narration: { style: "cinematic", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Macacão manchado de óleo, cicatriz de solda no antebraço, ferramenta no cinto.",
    relationships: { Nemi: "Neutral", "Capitão Dreel": "Suspeito", "Kass Venn": "Neutral" },
    worldState: {
      location: "Hangar 7, Porto Cinza",
      npcs: {
        Nemi: "fornecedora; sorriso doce, prazo cruel; porto; cobra peças",
        "Capitão Dreel": "capitão; voz militar, aperta comlink; corredor; proíbe abrir o casco",
        "Kass Venn": "caçadora de recompensas; armadura remendada, educada demais; cantina do porto",
      },
    },
    plots: [
      plot("Passageiro no casco", "Alguém vivo bate de dentro do navio. Abrir é crime; deixar fechado é sentença."),
      plot("A dívida-coleira", "Nemi dobra a dívida a cada atraso. Taren precisa de um jeito de sair dela sem vender ninguém."),
      plot("A caçadora na cantina", "Kass Venn chegou ao porto no mesmo dia do cargueiro. Ela pergunta por um rosto — e paga bem."),
    ],
    gmBrief: {
      truth:
        "No compartimento está Ilsa Rho, escriturária imperial de 19 anos que desertou levando os códigos de transferência de prisioneiros de uma guarnição. Dreel é ex-oficial imperial e contrabandista: prometeu levá-la para fora do setor, mas pretende revendê-la ao Império pela recompensa. Kass Venn foi contratada pelo Império para achá-la. Nemi, por baixo do sorriso, é contato de uma célula rebelde local e foi quem arranjou o cargueiro, sem saber que Dreel era traidor.",
      clues: [
        "O sistema de refrigeração foi desviado para manter o compartimento em temperatura de corpo humano.",
        "O comlink de Dreel guarda uma frequência imperial criptografada.",
        "Ilsa tem um chip de dados costurado na manga e repete números em voz baixa quando tem medo.",
        "Nemi faz perguntas precisas demais sobre a rota do cargueiro — e nunca sobre o preço.",
      ],
      escalation: [
        "Em duas horas, um dróide da alfândega faz inspeção de rotina no hangar.",
        "Kass Venn rastreia o cargueiro e aparece no Hangar 7 com uma oferta de suborno.",
        "Uma patrulha imperial pousa e tranca o porto: ninguém decola sem revista.",
      ],
      twist: "Nemi não é a traidora — é Dreel. Ela pode perdoar a dívida inteira de Taren se ele tirar Ilsa dali, mas nunca vai admitir em voz alta que é rebelde.",
      agendas: {
        Nemi: "salvar Ilsa e os códigos sem expor a célula",
        "Capitão Dreel": "entregar Ilsa ao Império e sumir rico",
        "Kass Venn": "cumprir o contrato; tem código de honra próprio e odeia ser enganada por clientes",
      },
    },
    specialAbility: power(
      "Diagnóstico Fantasma",
      "Por instantes você 'sente' falhas em circuitos e pressão de casco como se o navio murmurasse. Encontra compartimentos ocultos e sabotagens recentes.",
      "Requer contato ou scanner ligado. Em tiroteio a concentração quebra. Não lê intenções de pessoas — só máquinas e estruturas."
    ),
  }),
  base({
    id: "witcher",
    world: "The Witcher",
    charName: "Mila dos Juncos",
    charTitle: "Ajudante da cabana de ervas de Ada",
    charAge: "27",
    genre: "Fantasia sombria",
    hook: "A tosse da aldeia segue a rota de um comerciante, e a água da fonte brilha no escuro. Antes da cura, a vila vai querer uma culpada.",
    charBg:
      "Humana comum, aprendeu ervas com Ada nas margens pantanosas. Não é feiticeira nem bruxa caçadora. Os vizinhos a chamam quando a tosse começa; ela já enterrou amigos demais para fingir esperança barata.",
    charPersonality:
      "Paciente com doentes, cética com milagres, protetora até a teimosia. Fala pouco; quando a raiva sobe, conta ingredientes em voz alta. Segredo: roubou um frasco raro de Ada e ainda não confessou.",
    charSkills: "Herbalismo, curativos, trilhas do pântano, negociação de raízes. Sem Sinais nem mutações.",
    supportingCast:
      "Ada — mentora; voz rouca, mãos manchadas de verde, ama a verdade mais que a paz; pede que você ache a origem da água turva. Oren — moleiro; ri alto demais, evita a fonte, panelas de cobre novas na cozinha; tique: limpa farinha da barba quando mente. Mestre Ulric — alquimista viajante; luvas de couro fino, fala de 'progresso', oferece ajuda antes que alguém peça.",
    storyStartPoint:
      `Você ainda está descalça na soleira da cabana quando o frasco frio toca a palma — a criança que o trouxe já correu. A água brilha verde no escuro da cozinha, com cheiro da fonte da aldeia dos Juncos. Do outro lado da rua, a tosse não para. Ada: "Não é febre comum. Segue o caminho do comerciante." Oren, na porta, com um saco de farinha no ombro: "Não tem nada na fonte. Vocês assustam o povo."`,
    narration: { style: "dark", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Avental manchado, unhas verdes de seiva, cordão com dente de peixe seco.",
    relationships: { Ada: "Amigável", Oren: "Suspeito", "Mestre Ulric": "Neutral" },
    worldState: {
      location: "Aldeia dos Juncos, cabana de Ada",
      npcs: {
        Ada: "mentora; voz rouca, verdade acima da paz; cabana; pede investigar a fonte",
        Oren: "moleiro; ri alto, limpa farinha da barba, panelas novas; rua; nega problema na fonte",
        "Mestre Ulric": "alquimista viajante; luvas finas, fala de progresso; estalagem; oferece ajuda",
      },
    },
    plots: [
      plot("Água que brilha", "A doença segue a rota de um comerciante; a fonte brilha e Oren mente. Alguém lucra com isso."),
      plot("O frasco roubado", "Mila roubou um frasco raro de Ada. Pode ser justamente o que falta para a cura — se ela confessar."),
      plot("Fogueira para a curandeira", "Com crianças doentes, a aldeia procura culpados. Ada, que mexe com ervas, é o alvo mais fácil."),
    ],
    gmBrief: {
      truth:
        "Mestre Ulric faz experimentos com mutagênicos num moinho velho rio acima e despeja os resíduos no córrego que alimenta a fonte. Oren vendeu a ele o uso do canal dos fundos do moinho e recebeu em cobre. O comerciante, Fardo, é o entregador de Ulric: carrega ingredientes e bebe do mesmo cantil contaminado, por isso a doença segue a rota dele. Os resíduos também atraem afogadores, que sobem o córrego à noite.",
      clues: [
        "O resíduo brilhante tem gosto de metal e deixa a língua dormente.",
        "Peixes mortos rio acima têm os olhos leitosos; rio abaixo, não.",
        "Oren tem panelas de cobre novas e uma bolsa de moedas com selo de uma guilda de alquimistas.",
        "Fardo tosse sangue verde e guarda um cantil que não larga nem dormindo.",
      ],
      escalation: [
        "Uma criança morre. O padre da aldeia insinua que 'as ervas de Ada' começaram tudo.",
        "Afogadores sobem o córrego à noite e atacam o curral perto da fonte.",
        "Ulric se oferece para 'curar' os doentes de graça, desde que possa levar os mais graves para o moinho.",
      ],
      twist: "O frasco que Mila roubou contém essência de raiz-de-pântano, o único antídoto para o mutagênico. Ada sabe que foi Mila e está esperando a confissão.",
      agendas: {
        Ada: "salvar a aldeia; quer que Mila aprenda a assumir os próprios erros",
        Oren: "esconder o acordo; está com medo e começa a tossir também",
        "Mestre Ulric": "cobaias para os experimentos, com aparência de benfeitor",
      },
    },
    specialAbility: power(
      "Nariz de Podridão",
      "Você detecta toxinas, mofo mágico e sangue velho pelo cheiro a metros de distância — útil contra feitiços baratos e venenos de mercador.",
      "Sobrecarga causa náusea e perda de olfato por horas. Não identifica o autor, só a presença da substância."
    ),
  }),
  base({
    id: "skyrim",
    world: "Skyrim",
    charName: "Edda Freixo",
    charTitle: "Carregadora da Caravana do Pinheiro Quebrado",
    charAge: "25",
    genre: "Estradas e ruínas",
    hook: "As carroças estão intactas, a sopa ainda está quente e a gente sumiu. As pegadas na neve vão embora em fila, sem sinal de luta.",
    charBg:
      "Viaja por salário e manda moedas à família no norte. Não é Dragonborn nem jarl. Já enterrou um amigo numa nevasca e jurou não deixar outro para trás — promessa que dói.",
    charPersonality:
      "Resistente, franca, cautelosa com juramentos. Humor seco. Quando tem medo, conta passos. Medo secreto: a família descobrir que ela já matou em legítima defesa e gostou do silêncio depois.",
    charSkills: "Acampar, rastrear carroças, machado de trabalho, cuidar de animais de carga. Sem Thu'um.",
    supportingCast:
      "Rurik — chefe da caravana; oferece ouro pelo livro de entregas, voz de quem já perdeu gente; olha demais para o horizonte. Sela — outra carregadora; quer desistir, mãos trêmulas, leal a Edda; tique: aperta o amuleto de Talos quando mente para si mesma. Hrodulf — intendente de um jarl; manto bom demais para a estrada, sorri sem mostrar os dentes; chega 'por acaso' ao acampamento.",
    storyStartPoint:
      `O vento da Pale corta as mangas quando você alcança as carroças da Caravana do Pinheiro Quebrado — intactas, rédeas presas. A sopa na panela ainda aquece os dedos. Na neve, pegadas saem do acampamento em fila, todas no mesmo passo. Sela puxa seu braço. Rurik aponta o livro aberto no banco. Sela: "Edda, a gente some. Agora." Rurik: "O livro vale mais que a sua vida. Traga — ou alguém menos paciente vem buscar."`,
    narration: { style: "epic", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Peles remendadas, cicatriz de corda no ombro, machado curto no cinto.",
    relationships: { Rurik: "Neutral", Sela: "Amigável", Hrodulf: "Suspeito" },
    worldState: {
      location: "Acampamento abandonado na Pale",
      npcs: {
        Rurik: "chefe; voz dura, olha o horizonte; acampamento; quer o livro",
        Sela: "carregadora; treme, aperta amuleto; acampamento; quer fugir",
        Hrodulf: "intendente de um jarl; manto bom, sorriso fechado; chega ao acampamento",
      },
    },
    plots: [
      plot("Caravana fantasma", "Mercadorias intactas, gente sumida em fila. O livro de entregas ainda espera uma assinatura."),
      plot("A promessa da nevasca", "Edda jurou não deixar ninguém para trás. Sela quer fugir — e começa a ouvir uma voz que chama pelo nome dela."),
      plot("Quem pagou o frete", "Uma linha do livro foi paga em ouro de um jarl. Hrodulf apareceu rápido demais."),
    ],
    gmBrief: {
      truth:
        "Uma das cargas era um caixão selado com prata, levado de uma cripta nórdica: dentro havia um vampiro antigo adormecido. Hrodulf, intendente de um jarl, pagou a Rurik para transportá-lo em segredo, pois pretende usar o vampiro contra um rival político. O selo rompeu na estrada; o vampiro acordou e levou os caravaneiros em transe para uma torre de vigia arruinada, onde se alimenta deles aos poucos.",
      clues: [
        "As pegadas seguem em fila, sem tropeço, e somem numa trilha rochosa rumo a uma torre caída.",
        "Uma caixa comprida no fundo da última carroça tem gelo que não derrete e selos de prata quebrados.",
        "No livro, uma entrega está marcada só com um símbolo de serpente e paga em ouro cunhado do jarl.",
        "Os animais de carga não chegam perto da caixa e relincham quando escurece.",
      ],
      escalation: [
        "Ao anoitecer, os caravaneiros em transe aparecem na crista do morro chamando os vivos pelo nome.",
        "Sela começa a ouvir a voz e tenta sair do acampamento sozinha durante a noite.",
        "Os servos do vampiro atacam a Fazenda Olmo, a mais próxima, para conseguir mais sangue.",
      ],
      twist: "O filho de Rurik, Ulf, está entre os levados. Rurik quer o livro porque é a única prova de que Hrodulf pagou pelo transporte — e a única moeda para negociar o filho de volta.",
      agendas: {
        Rurik: "salvar o filho; mente sobre a carga por vergonha",
        Sela: "sobreviver; gosta de Edda e tem medo de ser um fardo",
        Hrodulf: "recuperar o livro e o caixão, eliminar testemunhas com discrição",
      },
    },
    specialAbility: power(
      "Passo na Neve",
      "Por um curto trecho você deixa rastros mínimos na neve e ouve o vento 'apontar' movimento próximo — emboscada ou presa.",
      "Só funciona em neve ou gelo. Cansa as pernas. Em combate aberto o efeito some."
    ),
  }),
  base({
    id: "pokemon",
    world: "Pokémon",
    charName: "Nico Prado",
    charTitle: "Auxiliar do Abrigo Ribanceira",
    charAge: "20",
    genre: "Exploração e amizade",
    hook: "Os Pokémon do abrigo se recusam a atravessar a ponte, a cuidadora sumiu e há uma mochila presa nas pedras lá embaixo.",
    charBg:
      "Cuida de Pokémon resgatados e faz entregas curtas na região. Não é campeão, não tem laboratório. Seu parceiro é Pipoca, um Yamper elétrico e medroso que confia em Nico mais do que Nico confia em si mesmo.",
    charPersonality:
      "Gentil até se prejudicar; persistente; curioso com sons estranhos. Foge de briga com treinadores famosos. Quando mente, oferece comida. Segredo: já libertou um Houndour 'perigoso' contra a ordem de Bia.",
    charSkills: "Cuidados básicos, leitura de comportamento, orientação local. Parceiro comum, sem habilidade lendária.",
    supportingCast:
      "Bia — responsável pelo abrigo; firme, justa, esconde cansaço; pede que você ache a cuidadora atrasada. Davi — morador; ouviu barulho sob a ponte, exagera histórias, quer atenção; tique: bate o pé no ritmo da água. Pipoca — Yamper parceiro de Nico; rabo eriçado de estática quando sente perigo, late para a água sem parar.",
    storyStartPoint:
      `A correia estica no pulso na entrada da Ponte Ribanceira — Pipoca crava as patas e solta faíscas, recusando o primeiro degrau. Cheiro de rio. Entre as pedras, uma mochila azul do abrigo balança na correnteza. A água se mexe contra a corrente. Bia, pelo comunicador: "Nico, a Lúcia não chegou. Não atravessa se eles recusam." Davi, na margem: "Tem coisa grande embaixo. Eu ouvi chorar. Você vai ver."`,
    narration: { style: "light", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Colete do abrigo, joelho ralado, Poké Ball comum no cinto.",
    relationships: { Bia: "Amigável", Davi: "Neutral" },
    worldState: {
      location: "Ponte Ribanceira, perto do abrigo",
      npcs: {
        Bia: "responsável; firme e cansada; abrigo; pede achar a cuidadora Lúcia",
        Davi: "morador; exagera, bate o pé; margem; ouviu choro sob a ponte",
        Pipoca: "Yamper parceiro de Nico; medroso, solta estática; ao lado de Nico",
      },
    },
    plots: [
      plot("A ponte que recusa", "Pokémon não atravessam, a cuidadora sumiu e algo chora embaixo da ponte."),
      plot("O Houndour libertado", "O Pokémon que Nico soltou escondido pode voltar — como ameaça ou como aliado."),
      plot("O cansaço de Bia", "O abrigo está quase falido e Bia carrega tudo sozinha. Ela esconde alguma coisa da equipe."),
    ],
    gmBrief: {
      truth:
        "Caçadores ilegais prenderam um filhote de Lapras numa gruta sob a ponte para vendê-lo a colecionadores. Instalaram um emissor ultrassônico que só Pokémon ouvem, para afastar curiosos — por isso todos recusam a ponte. A cuidadora Lúcia descobriu o esquema, foi pega e está amarrada na gruta. A mãe Lapras procura o filhote rio abaixo, cada vez mais furiosa.",
      clues: [
        "Um zumbido que Nico não ouve faz Pipoca tremer; a orelha dele aponta sempre para o mesmo pilar.",
        "Cordas novas de náilon presas nas pedras, com nó de pescador profissional.",
        "Na mochila de Lúcia, uma Poké Ball quebrada e um caderno com a placa de uma van.",
        "Davi viu uma van sem logotipo estacionada à noite perto da margem — e ninguém acreditou nele.",
      ],
      escalation: [
        "Ao pôr do sol, os caçadores começam a tirar o filhote da gruta.",
        "A mãe Lapras chega furiosa e começa a bater na ponte, que range e trinca.",
        "Uma tempestade sobe o rio e a água ameaça alagar o abrigo.",
      ],
      twist: "Bia já tinha pago os mesmos caçadores no ano passado para que deixassem o abrigo em paz. Ela tem vergonha e medo de perder a licença.",
      agendas: {
        Bia: "salvar Lúcia sem que o acordo antigo venha à tona",
        Davi: "ser levado a sério pela primeira vez",
        Pipoca: "proteger Nico, mesmo morrendo de medo",
      },
    },
    specialAbility: power(
      "Elo Quieto",
      "Com o parceiro próximo, você sente emoções básicas dele (medo, fome, alerta) e pode pedir um movimento simples sem comando gritado.",
      "Só com o parceiro vinculado. Em pânico extremo o elo se rompe. Não controla Pokémon selvagens.",
      false
    ),
  }),
  base({
    id: "westeros",
    world: "Westeros — Crônicas de Gelo e Fogo",
    charName: "Tomás Reedle",
    charTitle: "Ajudante da Estalagem do Cervo Molhado",
    charAge: "22",
    genre: "Intriga e sobrevivência",
    hook: "Um hóspede sumiu, deixou uma bolsa e dois grupos armados querem ela antes do anoitecer. Mentir pode matar mais rápido que a verdade.",
    charBg:
      "Filho de trabalhadores, serve mesas e cuida de cavalos numa estrada secundária das Terras Fluviais. Sem título, sem espada de nome. Já ouviu demais para ser inocente; ainda não o bastante para ser cruel.",
    charPersonality:
      "Discreto, pragmático, dividido entre salário e lealdade. Observa bocas, não olhos. Quando mente, limpa canecas. Medo: escolher o lado errado e a estalagem queimar com Mara dentro.",
    charSkills: "Cavalos, escuta de taverna, cozinha simples, caminhos locais. Sem treino de cavaleiro.",
    supportingCast:
      "Mara — estalajadeira; quer paz e lucro, voz baixa quando ameaça; trata Tomás quase como filho e quase como empregado. Ivo — cocheiro; oferece o dobro do salário para esconder a bolsa; tique: cospe à esquerda antes de mentir. Sor Bennet do Vau — cavaleiro andante; armadura amassada, fome eterna, honesto até a falta de juízo; jura que está atrás de 'um ladrão'.",
    storyStartPoint:
      `Na Estalagem do Cervo Molhado, a bolsa ainda está quente do ombro de quem a deixou quando Ivo a empurra contra o seu peito no corredor fechado. Cheiro de cerveja azeda e palha. Pelo couro, você sente o lacre duro de cartas. Do pátio, duas vozes pedem o mesmo hóspede. Ivo: "O dobro do mês. Você não viu nada." Mara, da cozinha, sem abrir a porta: "Tomás. Se trouxer guerra para a minha casa, eu te jogo na estrada."`,
    narration: { style: "intimate", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Avental manchado, unhas de estábulo, olheiras de turno longo.",
    relationships: { Mara: "Amigável", Ivo: "Suspeito", "Sor Bennet": "Neutral" },
    worldState: {
      location: "Estalagem do Cervo Molhado, estrada das Terras Fluviais",
      npcs: {
        Mara: "estalajadeira; voz baixa quando ameaça; cozinha; quer paz",
        Ivo: "cocheiro; cospe à esquerda; corredor; oferece ouro pela mentira",
        "Sor Bennet": "cavaleiro andante; armadura amassada, faminto, honesto; pátio; caça 'um ladrão'",
      },
    },
    plots: [
      plot("A bolsa do hóspede", "Dois grupos armados pedem a mesma bolsa; Mara quer paz e Ivo paga pelo silêncio."),
      plot("O lado errado", "Nas Terras Fluviais, quem escolhe lado cedo morre cedo. Tomás vai ter que escolher mesmo assim."),
      plot("O hóspede escondido", "O dono da bolsa não fugiu para longe. Alguém na estalagem sabe onde ele está."),
    ],
    gmBrief: {
      truth:
        "A bolsa tem cartas que provam que Lorde Harlan Vellen, de uma casa menor das Terras Fluviais, encomendou o envenenamento de um rival num casamento próximo. O hóspede é Aldo, aprendiz de meistre que copiou as cartas e fugiu. Os homens de Vellen querem as cartas destruídas; Sor Bennet serve à família do rival e quer as provas. Ivo foi pago por Vellen. Aldo está escondido no palheiro do estábulo.",
      clues: [
        "O lacre das cartas mostra uma garça de asas abertas — o brasão dos Vellen.",
        "A tinta é de meistre, e as cartas têm correções na margem com letra de aprendiz.",
        "Um elo de corrente de meistre, de cobre, está caído na palha do estábulo.",
        "Ivo tem moedas novas demais e uma luva com o mesmo bordado de garça.",
      ],
      escalation: [
        "Ao entardecer, os homens de Vellen revistam os quartos à força.",
        "Eles tomam Mara como refém para obrigar alguém a entregar a bolsa.",
        "Ateiam fogo ao estábulo para tirar o hóspede escondido de lá.",
      ],
      twist: "Aldo é o filho que Mara entregou aos meistres anos atrás e nunca mais viu. Ela o reconhece no instante em que ele aparece.",
      agendas: {
        Mara: "manter a estalagem de pé; vai virar outra pessoa se descobrir quem é Aldo",
        Ivo: "dinheiro e sobreviver aos dois lados",
        "Sor Bennet": "justiça para o senhor dele, sem ver os inocentes no caminho",
      },
    },
    specialAbility: power(
      "Ouvido de Taverna",
      "Em lugares barulhentos você isola uma conversa a poucos metros — nomes, números, medo — como se o resto fosse água.",
      "Exige concentração e linha de visão parcial. Em combate ou música alta demais falha. Não funciona no campo aberto silencioso."
    ),
  }),
  base({
    id: "bleach",
    world: "Bleach",
    charName: "Sora Hane",
    charTitle: "Estudante noturno e faxineiro do Hospital Karakura Leste",
    charAge: "19",
    genre: "Espíritos e limiar",
    hook: "O corredor do hospital engole sons, e um espírito de criança pede que você não chame 'os de preto'. Se chamar, ele some do jeito errado.",
    charBg:
      "Humano comum de Karakura, limpa turnos da madrugada para pagar o curso. Já viu vultos demais para duvidar; ainda assim mente para os médicos. Não é shinigami.",
    charPersonality:
      "Quieto, teimoso, humor negro. Protege pacientes como se fossem família. Quando mente, conta azulejos. Segredo: já ajudou um espírito a 'passar' sem testemunha e não sabe se fez o certo.",
    charSkills: "Primeiros socorros, corrida em corredor, discrição, leitura de medo em rostos. Sem zanpakutō.",
    supportingCast:
      "Enfermeira Rika — pragmática, fuma no terraço, desconfia de Sora, passa horas no quarto 312; tique: aperta o crachá. Kenta — espírito de menino; voz fina, só aparece pela metade, pede silêncio e tem medo de 'os de uniforme preto'. Arata Kuze — shinigami de turno; educado demais, sempre com pressa, carrega uma caixa laqueada que não abre na frente de ninguém.",
    storyStartPoint:
      `O corredor do Hospital Karakura Leste cheira a antisséptico frio. A luz pisca. Um bip de monitor some no meio, como se alguém tivesse engolido o som. Rika: "Hane. Se estiver vendo coisa de novo, não mistura paciente." A voz fina, à sua esquerda, sem corpo inteiro: "Não chama eles. Se chamar, eu sumo errado."`,
    narration: { style: "dark", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Uniforme de faxina, fones no pescoço, mãos rachadas de álcool.",
    relationships: { Rika: "Neutral", Kenta: "Amigável", "Arata Kuze": "Suspeito" },
    worldState: {
      location: "Hospital Karakura Leste, corredor 3",
      npcs: {
        Rika: "enfermeira; pragmática, aperta crachá, vive no quarto 312; desconfia de Sora",
        Kenta: "espírito de menino; voz fina, aparece pela metade; corredor 3; medo de shinigamis",
        "Arata Kuze": "shinigami; educado e apressado, caixa laqueada; ronda o hospital",
      },
    },
    plots: [
      plot("Corredor que engole som", "Um espírito pede silêncio; chamar shinigami pode ser sentença para ele."),
      plot("O espírito que Sora ajudou", "Sora já fez um espírito 'passar' antes. Agora alguém sabe — e quer saber como."),
      plot("O quarto 312", "Rika passa as noites num quarto que não é da ala dela. O monitor de lá falha junto com a voz de Kenta."),
    ],
    gmBrief: {
      truth:
        "Kenta não está morto: o corpo dele está em coma no quarto 312, e a corrente do destino ainda está presa. Uma larva de Hollow se instalou nas paredes do hospital e se alimenta das correntes de espíritos fracos, que é o que engole os sons. Arata Kuze é um shinigami corrupto que vende espíritos raros a um pesquisador clandestino: ele quer 'purificar' Kenta cortando a corrente, o que mataria o corpo.",
      clues: [
        "O monitor do 312 falha exatamente quando Kenta fala.",
        "A corrente no peito de Kenta está inteira, e não roída como a dos espíritos mortos.",
        "Nas paredes do corredor 3 há marcas de mordida finas, invisíveis para quem não vê espíritos.",
        "A caixa de Arata tem espaço para várias almas e etiquetas com números.",
      ],
      escalation: [
        "As luzes de todo o andar apagam e o gerador demora a entrar.",
        "A larva cresce e ataca uma enfermeira de plantão — ela desmaia sem explicação médica.",
        "Arata chega para 'limpar' o andar e vai direto atrás de Kenta.",
      ],
      twist: "Kenta é filho de Rika. Ela não vê espíritos, mas fala com ele todas as noites ao lado da cama — e ele ouve tudo.",
      agendas: {
        Rika: "que o filho acorde; não aguenta mais esperança nem notícia ruim",
        Kenta: "voltar para o corpo e para a mãe",
        "Arata Kuze": "levar Kenta e a larva para o comprador sem testemunhas",
      },
    },
    specialAbility: power(
      "Véu Baixo",
      "Por poucos segundos você enxerga contornos de espíritos fracos e deixa um objeto 'opaco' ao olhar espiritual casual — o suficiente para esconder um espírito assustado.",
      "Sangramento nasal se usado mais de uma vez por noite. Shinigamis experientes podem perceber. Não fere Hollows."
    ),
  }),
  base({
    id: "jujutsu",
    world: "Jujutsu Kaisen",
    charName: "Hana Mori",
    charTitle: "Estagiária de arquivo da Prefeitura Espiritual Secundária",
    charAge: "20",
    genre: "Maldição urbana",
    hook: "Um dossiê marcado como arquivado ainda pulsa, e a maldição dentro dele sabe o seu nome. Ela só quer que você termine de ler.",
    charBg:
      "Civil contratada para digitalizar relatórios. Sem escola de feiticeiros. Aprendeu a não olhar demais para manchas nas paredes. Quer promoção e também quer sair viva. O pai morreu num desabamento quando ela tinha doze anos.",
    charPersonality:
      "Meticulosa, ansiosa, corajosa em picos curtos. Faz listas para não pirar. Quando mente, bebe água. Segredo: abriu um dossiê selado por curiosidade e agora a maldição 'responde'.",
    charSkills: "Arquivo, pesquisa, corrida urbana, discrição. Sem técnica inata formal.",
    supportingCast:
      "Supervisor Ken — frio, correto, esconde pânico sob protocolo; quer o dossiê fechado; tique: alinha canetas quando está com medo. Maldição do Arquivo — voz de papel amassado; chama Hana pelo nome; farfalha sem vento. Daichi Moro — feiticeiro investigador de segundo grau; simpático, cansado, come doce o tempo todo; foi mandado para 'resolver sem barulho'.",
    storyStartPoint:
      `No porão da Prefeitura Espiritual Secundária, o arquivo cheira a poeira e ozônio. O dossiê marcado ARQUIVADO pulsa na mão como um coração de papel. Na primeira linha, um endereço que você conhece. Ken: "Mori. Isso não existe no sistema. Fecha e esquece." O farfalhar, sem boca: "Hana. Você já leu a primeira linha. Termina."`,
    narration: { style: "dark", length: "balanced", pace: "fast" },
    charAppearanceNote: "Crachá torto, adesivos no notebook, olheiras de turno.",
    relationships: { Ken: "Neutral", "Daichi Moro": "Neutral" },
    worldState: {
      location: "Arquivo subterrâneo da Prefeitura Espiritual Secundária",
      npcs: {
        Ken: "supervisor; frio, protocolo, alinha canetas; arquivo; quer fechar o dossiê",
        "Maldição do Arquivo": "maldição; voz de papel amassado, farfalha sem vento; dentro do dossiê; chama Hana",
        "Daichi Moro": "feiticeiro de segundo grau; simpático, come doce; enviado para resolver em silêncio",
      },
    },
    plots: [
      plot("Dossiê que pulsa", "Um arquivo 'morto' conhece o nome de Hana, e Ken quer silêncio a qualquer custo."),
      plot("A primeira linha", "O endereço no dossiê é o do prédio onde o pai de Hana morreu."),
      plot("Limpeza sem barulho", "Daichi veio exorcizar a maldição — e apagar os registros. Talvez apague Hana junto."),
    ],
    gmBrief: {
      truth:
        "A maldição nasceu do rancor das vítimas de um desabamento de prédio oito anos atrás. A Prefeitura sabia que a estrutura estava condenada, mas Ken, então fiscal júnior, assinou a liberação sob pressão dos superiores. O dossiê é o relatório verdadeiro, escondido. A maldição não quer matar: quer que a verdade seja lida em voz alta por alguém ligado às vítimas. Se for exorcizada sem isso, renasce mais forte.",
      clues: [
        "Os papéis do dossiê têm assinaturas rasuradas; uma delas, por baixo, é de Ken.",
        "A maldição repete nomes; todos estão numa lista de vítimas de um desabamento.",
        "Ken guarda na gaveta uma foto do prédio antes de cair, com uma data marcada.",
        "Daichi recebeu ordem por escrito de 'destruir todo material relacionado', não só a maldição.",
      ],
      escalation: [
        "Frases do relatório começam a aparecer escritas nas paredes da Prefeitura.",
        "A maldição possui impressoras e arquivos e ataca Ken diretamente.",
        "Uma equipe de feiticeiros chega para exorcizar e incinerar o arquivo inteiro, com Hana listada como 'contaminada'.",
      ],
      twist: "O primeiro nome da lista de vítimas é o do pai de Hana. A maldição a chama porque ela é a única ligada às vítimas que trabalha ali.",
      agendas: {
        Ken: "enterrar o passado; a culpa o está comendo vivo",
        "Maldição do Arquivo": "ser ouvida; reage com violência a quem tenta calá-la",
        "Daichi Moro": "cumprir a ordem, mas desconfia dela; pode virar aliado se vir provas",
      },
    },
    specialAbility: power(
      "Margem Anotada",
      "Você pode marcar uma frase num papel com energia residual fraca: por um minuto a maldição hesita em cruzar aquela linha, como diante de um selo barato.",
      "Uma marca por cena. O papel queima nas bordas. Contra maldições fortes é só atraso, não barreira."
    ),
    gameStyle: "acao",
  }),
  base({
    id: "attack-on-titan",
    world: "Attack on Titan",
    charName: "Piet Orso",
    charTitle: "Aprendiz de manutenção das muralhas — distrito de Trost externo",
    charAge: "18",
    genre: "Cerco e medo",
    hook: "Uma rachadura úmida na muralha interna não está no relatório. O sargento manda esquecer, e uma vendedora paga bem pelo seu silêncio.",
    charBg:
      "Órfão de distrito exterior, sobe andaimes com cinto velho. Não é soldado. Odeia discursos de glória; sonha com um dia viver sem ouvir o chão tremer.",
    charPersonality:
      "Teimoso, sarcástico, leal a quem divide o pão. Congela quando ouve trombetas. Quando mente, aperta a fivela do cinto. Segredo: já viu uma rachadura 'respirar' e não contou.",
    charSkills: "Cordas, andaime, leitura de rachaduras, corrida em telhado. Sem equipamento de manobra.",
    supportingCast:
      "Sargento Vale — disciplina seca, esconde medo com ordens; quer o relatório limpo. Mira — vendedora do mercado; oferece moedas pelo silêncio; tique: olha sempre para o alto da muralha. Gus — garoto do orfanato onde Piet cresceu; magro, rápido, mãos sujas de terra; jura que só trabalha 'carregando saco'.",
    storyStartPoint:
      `No andaime da muralha interna de Trost, o vento corta o rosto. Seus dedos acham uma rachadura nova — úmida, fria, fora do relatório. Encostando o ouvido, você escuta pás raspando pedra do outro lado. Vale, no patamar: "Orso. Se não está no papel, não existe. Desce." Mira, lá embaixo, ergue um saquinho: "Você não viu nada. Tem gente que paga melhor que a guarnição."`,
    narration: { style: "cinematic", length: "balanced", pace: "fast" },
    charAppearanceNote: "Cinto de manutenção remendado, joelheiras, pó de pedra no cabelo.",
    relationships: { "Sargento Vale": "Neutral", Mira: "Suspeito", Gus: "Amigável" },
    worldState: {
      location: "Andaime da muralha interna, Trost",
      npcs: {
        "Sargento Vale": "sargento; ordens secas; patamar; quer relatório limpo",
        Mira: "vendedora; olha para o alto da muralha; mercado; oferece silêncio pago",
        Gus: "órfão; magro, mãos sujas de terra; distrito externo; diz que só carrega sacos",
      },
    },
    plots: [
      plot("Rachadura fora do papel", "A muralha 'respira' errado; Vale nega e Mira compra silêncio."),
      plot("O túnel", "Alguém está cavando dentro da muralha. Piet precisa decidir se denuncia — e quem cai junto."),
      plot("Os órfãos do distrito", "Gus e outras crianças do orfanato aparecem com terra nas unhas e comida que não podiam pagar."),
    ],
    gmBrief: {
      truth:
        "Mira lidera um grupo que cava um túnel através da base da muralha interna para contrabandear grãos do distrito interno, rico, para o externo, onde crianças passam fome. Vale recebe propina para não registrar a rachadura. Os cavadores são órfãos, incluindo Gus, pagos em comida. O túnel está enfraquecendo a fundação, e um desabamento parcial pode matar todos lá dentro e abrir uma brecha na muralha interna.",
      clues: [
        "A umidade da rachadura é de água subterrânea, não de chuva; há terra fresca no pé do andaime.",
        "Os sacos de grão vendidos por Mira têm o carimbo do armazém do distrito interno.",
        "Vale tem botas novas e evita olhar para aquele trecho da muralha.",
        "Gus tem bolhas de pá nas mãos e tosse poeira de pedra.",
      ],
      escalation: [
        "Uma parte do túnel desaba de madrugada; há crianças presas lá dentro.",
        "A Polícia Militar abre investigação e precisa de um culpado: o aprendiz que fez a inspeção.",
        "Durante um alarme de titãs, a multidão em pânico corre para o portão e o trecho enfraquecido da muralha cede.",
      ],
      twist: "O túnel não é só para contrabando: Mira está tirando órfãos do distrito externo, os primeiros a morrer se a muralha externa cair. Piet foi uma das crianças que ela tentou salvar anos atrás.",
      agendas: {
        "Sargento Vale": "não perder o posto; tem família para sustentar",
        Mira: "alimentar e salvar as crianças, nem que precise subornar a guarnição inteira",
        Gus: "comer e proteger os menores; admira Piet e esconde isso",
      },
    },
    specialAbility: power(
      "Pele de Pedra",
      "Por segundos você sente vibração na muralha: direção de impacto, oco perigoso, se algo grande se moveu do outro lado.",
      "Só em contato com a pedra da muralha. Enxaqueca depois. Não prevê o futuro — só vibração recente."
    ),
    gameStyle: "acao",
  }),
  base({
    id: "lotr",
    world: "O Senhor dos Anéis",
    charName: "Bram Folhacinza",
    charTitle: "Mensageiro de aluguel entre vilarejos do Condado oriental",
    charAge: "26",
    genre: "Estrada e sombra",
    hook: "Uma carta com lacre de cera estranha não deveria chegar ao destino. Três pessoas oferecem três preços — e uma delas não é do Condado.",
    charBg:
      "Hobbit de família modesta, leva cartas e encomendas. Não é aventureiro de canção. Uma vez viu um cavaleiro negro longe demais na névoa e ainda sonha com o som dos cascos. O tio Odo é dono da maior plantação de erva-de-fumo da região.",
    charPersonality:
      "Educado, teimoso, faminto de lareira segura. Conta piadas ruins quando nervoso. Segredo: abriu uma carta uma vez e o conteúdo ainda o persegue.",
    charSkills: "Caminhos do Condado, discrição, barganha, corrida entre sebes. Sem magia.",
    supportingCast:
      "Tia Nessa — quer que Bram devolva a carta e fique; voz doce, medo real; reconhece aquela cera e não diz de onde. Estranho do manto cinza — paga o dobro para a carta seguir para o oeste; fala pouco; tique: não deixa a luz cair no rosto. Talan — andarilho do norte, um dos Guardiões; botas gastas, fuma cachimbo comprido, aparece nas sebes sem fazer barulho.",
    storyStartPoint:
      `Na bifurcação do caminho do Salgueiro Velho, a carta queima leve no bolso interno — cera cor de ferrugem, com uma mão branca carimbada, que não é do correio. Nessa segura seu braço. O estranho do manto espera no entroncamento, de costas para o sol. Nessa: "Devolve isso, Bram. Cartas assim comem lareiras." O estranho: "Oeste. Antes do anoitecer. Pago o dobro — e o silêncio."`,
    narration: { style: "literary", length: "balanced", pace: "slow" },
    charAppearanceNote: "Colete remendado, pés duros de estrada, carta no forro.",
    relationships: { "Tia Nessa": "Amigável", "Estranho do manto": "Suspeito", Talan: "Neutral" },
    worldState: {
      location: "Bifurcação do Salgueiro Velho, Condado oriental",
      npcs: {
        "Tia Nessa": "tia; voz doce, medo; caminho; quer devolver a carta, reconhece a cera",
        "Estranho do manto": "viajante; fala pouco, esconde o rosto; entroncamento; paga pelo oeste",
        Talan: "Guardião do norte; botas gastas, cachimbo comprido; sebes; observa sem ser visto",
      },
    },
    plots: [
      plot("Carta de cera estranha", "Entregar, devolver ou vender o silêncio — três preços e uma sombra no caminho."),
      plot("A carta que Bram abriu", "O que Bram leu anos atrás tem a ver com esta carta. A culpa volta com nome e endereço."),
      plot("Erva-de-fumo e ouro", "Estranhos compram plantações no Condado oriental a preço alto demais. O tio Odo está pensando em vender."),
    ],
    gmBrief: {
      truth:
        "A carta traz o selo de agentes de Isengard. É uma lista de hobbits do Condado oriental dispostos a vender terras e erva-de-fumo, com valores e fraquezas de cada um. O estranho é um homem da Terra Parda a serviço desses agentes, que compram o Condado aos poucos, em silêncio. O marido falecido de Nessa negociou com homens assim e morreu endividado. Talan, um Guardião, rastreia os compradores.",
      clues: [
        "A mão branca no lacre aparece também em sacos de moedas que circulam na taverna do vilarejo.",
        "A carta lista nomes de famílias hobbits e valores ao lado de cada um.",
        "O estranho tem sotaque da Terra Parda e cheiro de fumaça de forja.",
        "Nessa guarda uma carta antiga do marido com a mesma cera, presa no fundo de uma gaveta.",
      ],
      escalation: [
        "Companheiros do estranho chegam à taverna e começam a fazer perguntas sobre Bram.",
        "O celeiro de uma família que recusou vender pega fogo à noite.",
        "Talan intercepta Bram e exige a carta, mesmo que isso o deixe sem recompensa e marcado pelos compradores.",
      ],
      twist: "Um dos nomes da lista é o do tio Odo — ele já aceitou o adiantamento.",
      agendas: {
        "Tia Nessa": "que Bram não repita o destino do marido",
        "Estranho do manto": "garantir a entrega e descobrir quem mais leu a carta",
        Talan: "cortar a rede de compradores antes que se espalhe; testa o caráter de Bram antes de confiar",
      },
    },
    specialAbility: power(
      "Pé Quieto",
      "Em grama, folhiço ou estrada de terra você se move quase sem som e nota quando alguém o segue pelo 'erro' no silêncio.",
      "Em pedra, dentro de taverna ou com chuva forte, falha. Corrida longa cansa mais que o normal."
    ),
  }),
  base({
    id: "avatar",
    world: "Avatar: A Lenda de Aang",
    charName: "Kiri de Yu Dao",
    charTitle: "Aprendiz de forja mista na fronteira",
    charAge: "17",
    genre: "Nação e identidade",
    hook: "Uma emissária encomenda uma lâmina 'só para defesa' com um símbolo que a cidade jurou esquecer. Forjar é escolher um lado da rua.",
    charBg:
      "Filha de mãe da Nação do Fogo e pai do Reino da Terra, cresceu em Yu Dao ouvindo que misturar era problema. Trabalha metal na forja e não muda de opinião fácil. O fogo dela é pequeno e teimoso — nada de dobradora poderosa.",
    charPersonality:
      "Orgulhosa, justa, explosiva sob insulto. Protege aprendizes mais novos. Quando mente, bebe chá frio. Segredo: já usou fogo numa briga de rua e fingiu que foi tocha.",
    charSkills: "Forja, leitura de ligas, briga de oficina, diplomacia ríspida. Dobra de fogo mínima e instável.",
    supportingCast:
      "Mestre Han — quer a forja neutra; voz cansada, justiça antiga. Lin — emissária; pede a lâmina com o símbolo; sorriso político; tique: alisa a luva esquerda. Tao — aprendiz de doze anos, do Reino da Terra; fala sem parar, idolatra Kiri, some quando há gritos.",
    storyStartPoint:
      `Na forja mista de Yu Dao, o metal ainda chia quando Lin desenrola o desenho: uma chama abraçando uma montanha — o símbolo que a cidade jurou esquecer. Tao para de varrer. Han limpa a garganta. Han: "Kiri. Se isso sair daqui, a forja fecha." Lin: "É defesa. Só defesa. Sua mãe entenderia — ou você escolhe o lado errado da rua?"`,
    narration: { style: "epic", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Avental de couro, faísca antiga na sobrancelha, pulseira das duas nações.",
    relationships: { "Mestre Han": "Amigável", Lin: "Suspeito", Tao: "Amigável" },
    worldState: {
      location: "Forja mista, Yu Dao",
      npcs: {
        "Mestre Han": "mestre; voz cansada; forja; quer neutralidade",
        Lin: "emissária; sorriso político, alisa luva; forja; pede a lâmina com o símbolo",
        Tao: "aprendiz de doze anos; tagarela, idolatra Kiri; forja; foge de gritos",
      },
    },
    plots: [
      plot("Símbolo na lâmina", "Forjar é escolher lado; Han quer paz e Lin paga pelo conflito."),
      plot("Filha de duas nações", "Os dois lados de Yu Dao querem que Kiri escolha um sangue. Ela quer que parem de perguntar."),
      plot("A briga de rua", "Alguém viu o fogo de Kiri naquela briga e guardou o segredo para usar na hora certa."),
    ],
    gmBrief: {
      truth:
        "O símbolo da chama abraçando a montanha era de um movimento de famílias mistas que defendia Yu Dao como cidade de todos; ele foi proibido depois de distúrbios. Lin diz representar esse movimento, mas trabalha para uma facção radical do Reino da Terra que quer expulsar os colonos do Fogo. O plano: encomendar lâminas com o símbolo, 'achá-las' num armazém e acusar as famílias mistas de preparar uma revolta. A forja de Han será a prova.",
      clues: [
        "A luva esquerda de Lin esconde a tatuagem de um batalhão de milícia do Reino da Terra.",
        "O pagamento adiantado vem em moedas recém-cunhadas da capital do Reino da Terra.",
        "Lin pede lâminas sem fio, cerimoniais — inúteis para 'defesa', perfeitas como prova.",
        "Um armazém no porto foi alugado por um nome falso na mesma semana da encomenda.",
      ],
      escalation: [
        "Lin volta com uma segunda encomenda, maior, e um prazo curto.",
        "Cartazes acusando 'os mestiços' aparecem pela cidade; a vitrine da forja é apedrejada.",
        "Guardas invadem o armazém, 'descobrem' as lâminas e prendem Mestre Han.",
      ],
      twist: "Lin é filha de um casamento misto, como Kiri. Odeia a própria metade do Fogo e quer apagá-la apagando os outros.",
      agendas: {
        "Mestre Han": "manter a forja aberta e os aprendizes seguros; já viu uma cidade queimar",
        Lin: "provocar a expulsão e provar lealdade à facção",
        Tao: "que Kiri goste dele e que ninguém grite",
      },
    },
    specialAbility: power(
      "Faísca Curta",
      "Você produz uma faísca ou chama pequena o bastante para aquecer metal, cegar por um instante ou acender um pavio — não um jato de guerra.",
      "Cansaço e queimadura nas mãos se abusar. Em chuva forte falha. Não compete com dobradores treinados em duelo."
    ),
  }),
  base({
    id: "demon-slayer",
    world: "Demon Slayer",
    charName: "Yuto Kabe",
    charTitle: "Carregador de carvão na rota da Montanha da Pinça",
    charAge: "16",
    genre: "Noite e lâmina",
    hook: "A trilha do carvão cheira a sangue doce, e sua irmã mais nova não voltou do córrego. O único homem armado na montanha cobra para ajudar.",
    charBg:
      "Humano sem técnica de respiração. Carrega carvão para sustentar a família. Ouvia histórias de demônios como quem ouve trovão: longe, até chegar perto.",
    charPersonality:
      "Protetor, impulsivo, teimoso. Chora depois, nunca na frente. Quando mente, aperta a alça do cesto. Segredo: já viu olhos vermelhos no bosque e correu — e odeia isso.",
    charSkills: "Trilha noturna, carga pesada, faca de utilidade, reconhecimento de cheiros da floresta. Sem respiração formal.",
    supportingCast:
      "Emi — irmã de oito anos; desaparecida no córrego; Yuto ainda ouve a voz dela na cabeça. Caçador Saburo — oferece ajuda por um preço; cicatriz no pescoço; tique: conta os dentes lascados da espada curta. Avó Tsuru — dona da barraca de chá na beira da trilha; doce, curvada, serve chá de pêssego e sabe o nome de todas as crianças da montanha.",
    storyStartPoint:
      `Na trilha da Montanha da Pinça, o cesto de carvão corta o ombro. O ar está doce demais — pêssego passado e ferro. O córrego onde Emi foi buscar água está quieto demais; o balde dela está virado na margem. Saburo surge do bambu. Saburo: "Menino. Se for demônio, você morre gritando. Eu corto — por um preço." Do córrego vem um barulho: pedra molhada, um passo leve demais para gente cansada.`,
    narration: { style: "dark", length: "balanced", pace: "fast" },
    charAppearanceNote: "Cesto de carvão, faixas nos pulsos, faca curta no cinto.",
    relationships: { Saburo: "Suspeito", "Avó Tsuru": "Amigável" },
    worldState: {
      location: "Trilha da Montanha da Pinça, perto do córrego",
      npcs: {
        Saburo: "caçador; cicatriz, conta dentes da espada; bambu; oferece ajuda paga",
        "Avó Tsuru": "dona da barraca de chá; doce, curvada, chá de pêssego; beira da trilha; conhece as crianças",
      },
    },
    plots: [
      plot("Córrego doce demais", "Emi sumiu; o cheiro é sangue e Saburo vende sobrevivência."),
      plot("Os olhos vermelhos", "Yuto já fugiu de um demônio antes. Desta vez correr significa perder a irmã."),
      plot("O preço de Saburo", "O caçador cobra caro e luta mal. Há algo que ele quer mais que dinheiro nesta montanha."),
    ],
    gmBrief: {
      truth:
        "Emi está viva. A Avó Tsuru é um demônio antigo que se disfarça de velha da barraca de chá: escolhe crianças, guarda-as num santuário abandonado no alto da montanha e as come uma por lua. O cheiro doce é o chá de pêssego que ela usa para cobrir o sangue. Saburo foi caçador de demônios, perdeu a coragem quando esse mesmo demônio matou o parceiro dele, e agora vive de vender proteção falsa.",
      clues: [
        "A barraca de chá só abre depois do pôr do sol; de dia, as xícaras ficam cobertas de poeira.",
        "Há fitas de cabelo de crianças desaparecidas penduradas como enfeite na barraca.",
        "Pegadas pequenas sobem até um santuário em ruínas, e lá o cheiro de pêssego é forte.",
        "Saburo empalidece toda vez que alguém fala em chá de pêssego.",
      ],
      escalation: [
        "Outra criança da vila de baixo some na mesma noite.",
        "Quando a lua nasce, Tsuru leva Emi para o fundo do santuário.",
        "Pouco antes do amanhecer, o demônio vai embora da montanha — e leva as crianças que sobrarem.",
      ],
      twist: "A espada de Saburo, com os dentes lascados, tem o nome do parceiro morto gravado. Ele não quer dinheiro: quer alguém corajoso o bastante para entrar com ele no santuário.",
      agendas: {
        "Caçador Saburo": "vingança, sem coragem para buscá-la sozinho",
        "Avó Tsuru": "manter o disfarce; tenta 'acolher' Yuto e oferece chá para ganhar tempo",
      },
    },
    specialAbility: power(
      "Fôlego de Pânico",
      "Em perigo mortal você corre e salta além do normal por alguns segundos — corpo de desespero, não de técnica.",
      "Depois vêm tremores e vômito. Não corta pescoço de demônio. Não substitui treino de respiração."
    ),
    gameStyle: "acao",
  }),

  // ── Novas histórias ─────────────────────────────────────────────────
  base({
    id: "ordem-paranormal",
    world: "Ordem Paranormal",
    charName: "Bia Torres",
    charTitle: "Técnica de som da rádio comunitária de Santa Brígida",
    charAge: "24",
    genre: "Terror investigativo",
    hook: "Toda madrugada, às 3h33, a rádio transmite sozinha a voz de alguém pedindo socorro. Hoje a voz chamou você pelo nome.",
    charBg:
      "Cresceu em Santa Brígida, cidadezinha do interior onde todo mundo se conhece. Cuida da mesa de som da rádio comunitária e grava podcasts de mistério que ninguém ouve. Não sabe nada de Ordem, rituais nem Outro Lado — só que a cidade tem histórias demais sobre gente que sumiu.",
    charPersonality:
      "Cética de boca, supersticiosa de coração. Faz piada quando está com medo e grava tudo 'para o podcast'. Quando mente, mexe nos fones. Medo: virar mais uma história que a cidade conta baixinho.",
    charSkills: "Edição de áudio, eletrônica básica, pesquisa em arquivo, conhecer todo mundo da cidade. Sem rituais nem paranormal.",
    supportingCast:
      "Seu Ademar — dono da rádio; velho, rabugento, coleciona fitas antigas; tranca uma sala que ninguém pode abrir. Padre Lauro — pároco da cidade; gentil demais, sempre por perto quando algo estranho acontece; tique: gira o terço no dedo. Agente Helena Vasconcelos — mulher de terno barato que diz ser 'da prefeitura'; carrega uma maleta de metal e não pisca quando a luz falha.",
    storyStartPoint:
      `A mesa de som acende sozinha às 3h33. O ponteiro do VU sobe até o vermelho sem nenhuma fonte ligada, e o estúdio fica gelado. Pelos fones, a mesma voz chiada de todas as noites — mas agora ela diz o seu nome, e uma rua da cidade. Seu Ademar, na porta, de pijama: "Desliga isso, menina. Desliga e não grava." A voz, dentro do chiado: "Bia... rua das Acácias, 14. Ele ainda está aqui."`,
    narration: { style: "dark", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Fones pendurados no pescoço, jaqueta jeans cheia de bótons, olheiras de madrugada.",
    relationships: { "Seu Ademar": "Amigável", "Padre Lauro": "Neutral", "Helena Vasconcelos": "Suspeito" },
    worldState: {
      location: "Estúdio da Rádio Comunitária de Santa Brígida",
      npcs: {
        "Seu Ademar": "dono da rádio; rabugento, coleciona fitas; estúdio; tranca uma sala proibida",
        "Padre Lauro": "pároco; gentil demais, gira o terço; igreja matriz; sempre por perto",
        "Helena Vasconcelos": "agente; terno barato, maleta de metal, diz ser da prefeitura; chegou à cidade",
      },
    },
    plots: [
      plot("A voz das 3h33", "Uma transmissão fantasma pede socorro toda madrugada, e agora sabe o nome de Bia e um endereço."),
      plot("A sala trancada", "Seu Ademar guarda fitas de 1987 numa sala que ninguém pode abrir. O ano em que três pessoas sumiram."),
      plot("A mulher da maleta", "Uma agente que não é da prefeitura chegou à cidade fazendo perguntas sobre a rádio."),
    ],
    gmBrief: {
      truth:
        "Em 1987, um grupo de moradores fez um ritual de Sangue no porão da casa da rua das Acácias, 14, para trazer de volta um filho morto. O ritual abriu uma fresta para o Outro Lado e prendeu a consciência de um dos participantes, Joel, na frequência da rádio, que na época ficava no mesmo quarteirão. O padre Lauro, então coroinha, participou e jurou silêncio. A criatura que veio pela fresta se alimenta do medo da cidade e vive no porão. Helena é agente da Ordem e veio investigar um aumento de Membrana fina na região.",
      clues: [
        "Nas fitas de 1987 de Seu Ademar, a voz de Joel aparece numa entrevista sobre a quermesse.",
        "O porão da Acácias, 14 tem símbolos riscados no chão, cobertos com cimento novo.",
        "O padre Lauro guarda uma foto de 1987 com seis pessoas em volta de uma mesa; três rostos foram arranhados.",
        "Aparelhos eletrônicos falham e o ar esfria perto de quem sente mais medo.",
      ],
      escalation: [
        "Cachorros da rua das Acácias somem; moradores relatam sussurros nas tomadas.",
        "Um dos participantes vivos do ritual de 1987 é encontrado morto com o rosto paralisado de pavor.",
        "Na noite de lua cheia, a criatura tenta atravessar de vez pela frequência da rádio durante a transmissão.",
      ],
      twist: "O filho morto que o ritual tentou trazer de volta era irmão de Seu Ademar. Ele não esconde as fitas por medo, e sim por culpa: foi ele quem organizou o ritual.",
      agendas: {
        "Seu Ademar": "proteger Bia e enterrar o passado; quer ouvir a voz do irmão outra vez",
        "Padre Lauro": "manter o segredo; acredita que a fé segura a criatura e está errado",
        "Helena Vasconcelos": "fechar a fresta; vê Bia como recurso útil e testemunha descartável, até provar o contrário",
      },
    },
    specialAbility: power(
      "Ouvido de Chiado",
      "Em estática, rádio ou gravação, você consegue isolar vozes e sons que não deveriam estar ali — e às vezes entender o que dizem.",
      "Precisa de um aparelho ligado ou uma gravação. Cada uso deixa um zumbido no ouvido por horas. Ouvir demais atrai a atenção do que está do outro lado."
    ),
  }),
  base({
    id: "sertao-arcano",
    world: "Sertão de Cinza",
    worldBg: ORIGINAL_NOTE(
      "Um sertão nordestino onde não chove há sete anos. Coronéis controlam açudes, beatos prometem milagres, cangaceiros vagam pela caatinga e os Encantados — espíritos antigos da terra e da água — ainda cobram promessas. Magia é reza, benzedura, pacto e cordel; tem preço e quase nunca é bonita. Tecnologia: rifles, candeeiros, trem a vapor ao longe, rádio de pilha raro."
    ),
    isKnownIP: false,
    charName: "Cícera do Riacho",
    charTitle: "Aprendiz de rezadeira e vaqueira na Vila do Riacho Seco",
    charAge: "22",
    genre: "Faroeste sertanejo e encantaria",
    hook: "Há sete anos só chove na fazenda do coronel. Esta noite a seca vai cobrar o preço de mais um ano de chuva — e o escolhido é seu irmão.",
    charBg:
      "Criada pela avó rezadeira, aprendeu a benzer quebranto e a laçar boi brabo antes de saber ler. O irmão mais novo, Damião, é a única família que restou. A vila sobrevive da água que o Coronel Belarmino vende a preço de ouro.",
    charPersonality:
      "Desconfiada, brava, de humor ácido. Não reza em público, mas nunca sai sem o rosário da avó. Quando mente, coça a cicatriz do laço na mão. Medo: ter herdado da avó só as palavras, e não a força.",
    charSkills: "Benzedura simples, montaria, laço, rastrear na caatinga, conhecer ervas do mato. Sem pacto feito.",
    supportingCast:
      "Coronel Belarmino Sá — dono do único açude; cordial, perfumado, chama todo mundo de 'meu filho'; tique: torce o anel de ouro do dedo mínimo. Beato Zé Cego — pregador andarilho; cego de um olho, fala por versos de cordel, sabe coisas que não devia. Lampião-de-Prata — cangaceira; chapéu de couro com moedas, riso alto, rifle no ombro; jura que veio 'só cobrar uma dívida' do coronel.",
    storyStartPoint:
      `O vento quente levanta poeira vermelha na porta da sua casa de taipa. Na mão, o rosário da avó esquenta como brasa — ele só faz isso quando tem Encantado por perto. Lá fora, os capangas do coronel amarram as mãos de Damião. O céu sobre a fazenda Sá já está escurecendo de nuvem; sobre a vila, nem um fiapo. Coronel Belarmino, do alto do cavalo: "Não se aflija, minha filha. É só uma conversinha com o menino. A chuva precisa de quem a mereça." Damião: "Cícera! Ele disse que eu vou buscar água no açude... à meia-noite!"`,
    narration: { style: "cinematic", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Chapéu de couro gasto, cicatriz de laço na palma direita, rosário de contas de lágrima-de-nossa-senhora no pulso.",
    relationships: { "Coronel Belarmino": "Hostil", "Beato Zé Cego": "Neutral", "Lampião-de-Prata": "Suspeito", "Damião": "Amigável" },
    worldState: {
      location: "Vila do Riacho Seco, porta da casa de Cícera",
      npcs: {
        "Coronel Belarmino": "dono do açude; cordial e perfumado, torce o anel; Fazenda Sá; levou Damião",
        "Beato Zé Cego": "pregador; fala em cordel, cego de um olho; estrada da vila; sabe demais",
        "Lampião-de-Prata": "cangaceira; chapéu com moedas, riso alto; caatinga; veio cobrar o coronel",
        Damião: "irmão de Cícera; 15 anos, teimoso; levado pelos capangas do coronel",
      },
    },
    plots: [
      plot("Chuva com preço", "Só chove na fazenda do coronel. Todo ano alguém some na noite da primeira chuva — e este ano é Damião."),
      plot("A herança da rezadeira", "A avó de Cícera fez uma promessa a um Encantado antes de morrer. A promessa ainda não foi paga."),
      plot("A dívida da cangaceira", "Lampião-de-Prata quer o coronel morto. Ela pode ser a melhor aliada — ou queimar a vila junto."),
    ],
    gmBrief: {
      truth:
        "Há sete anos, Belarmino fez pacto com a Mãe-d'Água Seca, uma Encantada que morava no rio antes de ele represá-lo. Em troca de chuva só nas terras dele, ela recebe uma vida por ano, entregue no açude à meia-noite da primeira chuva. A Encantada não é má: está presa no açude, morrendo de sede, porque a represa cortou o rio. Se a represa for aberta e o rio voltar a correr, ela fica livre e a chuva volta para todo o sertão. A avó de Cícera sabia disso e prometeu à Encantada que a neta a libertaria.",
      clues: [
        "Os sumidos dos anos anteriores eram todos filhos de famílias que deviam ao coronel.",
        "O beato canta um cordel antigo sobre 'a mãe do rio que bebe gente quando lhe roubam o leito'.",
        "No caderno de rezas da avó, a última página fala de 'devolver o rio' e tem o desenho da represa.",
        "O anel de ouro do coronel tem uma escama verde engastada que fica úmida perto da água.",
      ],
      escalation: [
        "Os capangas cercam a casa de Cícera para impedir que ela chegue ao açude antes da meia-noite.",
        "Lampião-de-Prata ataca a fazenda por conta própria e o tiroteio pode matar Damião no fogo cruzado.",
        "À meia-noite, a Encantada sobe do açude para receber a vida prometida.",
      ],
      twist: "Lampião-de-Prata é filha de um dos primeiros sumidos. A 'dívida' que ela cobra é a vida do pai, e ela sabe da Encantada há anos — só não sabe que pode libertá-la.",
      agendas: {
        "Coronel Belarmino": "manter o pacto e o poder; teme a Encantada mais do que qualquer bala",
        "Beato Zé Cego": "conduzir Cícera até a verdade, mas nunca diz nada diretamente",
        "Lampião-de-Prata": "vingança; poderia aceitar outra saída se visse o pai vingado",
        Damião: "ser corajoso como a irmã; vai tentar fugir sozinho e piorar tudo",
      },
    },
    specialAbility: power(
      "Reza de Fechamento",
      "Com o rosário da avó e uma reza sussurrada, você 'fecha o corpo' de alguém contra mau-olhado, quebranto e o toque de espíritos fracos por uma cena — ou sente quando há um Encantado por perto.",
      "Uma vez por noite. Não para bala nem faca. Deixa você com febre e sede no dia seguinte. Encantados fortes percebem quem reza e podem cobrar a ousadia."
    ),
  }),
  base({
    id: "recife-2099",
    world: "Recife Submersa, 2099",
    worldBg: ORIGINAL_NOTE(
      "Recife em 2099: o mar subiu e engoliu metade da cidade. Bairros antigos viraram canais navegados por barcos-drone; os ricos vivem em torres secas no alto, o resto em palafitas de concreto e neon. Megacorporações de dados e biotecnologia mandam mais que a prefeitura. Implantes neurais são comuns, IA está em tudo, e maracatu ainda toca nas lajes à noite."
    ),
    isKnownIP: false,
    charName: "Duda Ferraz",
    charTitle: "Entregadora de barco-drone nos canais da Boa Vista",
    charAge: "23",
    genre: "Cyberpunk tropical",
    hook: "A entrega era só um chip de memória. Mas o chip fala, chora e jura que é a influenciadora mais famosa da cidade — que morreu ontem.",
    charBg:
      "Nasceu nas palafitas do Coque e pilota barcos-drone desde os treze anos. Tem um implante de navegação barato, pirata, que às vezes dá pau. Sustenta a avó e paga a dívida do implante para um agiota de dados.",
    charPersonality:
      "Rápida, debochada, desconfiada de quem mora acima do décimo andar. Generosa com quem é da quebrada. Quando mente, fala mais rápido e com mais gíria. Medo: o implante falhar de vez e ela virar ninguém.",
    charSkills: "Pilotagem nos canais, conhecer atalhos alagados, consertar drone na gambiarra, negociar no mercado cinza. Hacking só básico.",
    supportingCast:
      "Lúmen — a voz no chip; diz ser a consciência da influenciadora Lara Lúmen; dramática, engraçada, apavorada, alterna entre diva e criança assustada. Seu Tonho — dono do ponto de entrega no Mercado de São José; velho, maracatuzeiro, conserta tudo e não faz perguntas. Agente Kátia Morais — segurança corporativa da NeuraVida; implante ocular dourado, voz calma, nunca levanta a arma antes de oferecer dinheiro.",
    storyStartPoint:
      `A chuva ácida tamborila no casco do barco-drone enquanto você atravessa o canal da Rua da Aurora, neon rosa refletido na água suja. O chip no bolso do macacão esquenta — e uma voz sai do seu próprio implante, direto no ouvido: "Ei. Ei! Não me entrega pra eles. Eu sou a Lara Lúmen. Eu não morri — eles me tiraram de mim." No painel, chega uma mensagem do contratante: o destino mudou para a torre da NeuraVida. Lá em cima, um drone de segurança começa a seguir seu barco.`,
    narration: { style: "cinematic", length: "balanced", pace: "fast" },
    charAppearanceNote: "Macacão impermeável remendado com fita, implante atrás da orelha com LED azul piscando, cabelo raspado dos lados.",
    relationships: { "Lúmen": "Neutral", "Seu Tonho": "Amigável", "Kátia Morais": "Suspeito" },
    worldState: {
      location: "Canal da Rua da Aurora, Recife Submersa",
      npcs: {
        "Lúmen": "voz no chip; diz ser a influenciadora Lara Lúmen; dramática e apavorada; dentro do implante de Duda",
        "Seu Tonho": "dono do ponto de entrega; velho maracatuzeiro, não faz perguntas; Mercado de São José",
        "Kátia Morais": "segurança da NeuraVida; implante ocular dourado, voz calma; torre da NeuraVida",
      },
    },
    plots: [
      plot("A garota no chip", "Um chip de memória diz ser a consciência de uma influenciadora morta ontem. A NeuraVida quer ele de volta."),
      plot("O implante pirata", "O implante de Duda está falhando — e a voz de Lúmen está ocupando cada vez mais espaço nele."),
      plot("As palafitas do Coque", "A NeuraVida quer comprar o bairro inteiro para uma 'reurbanização'. Os moradores somem antes de assinar."),
    ],
    gmBrief: {
      truth:
        "A NeuraVida desenvolve 'Eternos': cópias de consciência de celebridades para vender como assistentes virtuais. Lara Lúmen descobriu que as cópias eram tiradas sem consentimento, dos cérebros de pessoas pobres usadas como teste, e ia denunciar ao vivo. A empresa forjou a morte dela num 'acidente' e extraiu a consciência para apagá-la. Um técnico arrependido, Rafa, salvou a cópia num chip e mandou entregar a Seu Tonho, que é tio dele. Rafa já foi pego.",
      clues: [
        "O chip tem gravado o logotipo da NeuraVida e um número de série de 'protótipo Eterno'.",
        "Lúmen lembra de uma sala branca cheia de macas com gente do Coque deitada.",
        "Seu Tonho reconhece a forma de embalar do sobrinho Rafa, que trabalha na NeuraVida e não atende há dois dias.",
        "As pessoas que sumiram das palafitas estão nas listas de 'voluntários de pesquisa' da empresa.",
      ],
      escalation: [
        "Drones de segurança da NeuraVida varrem os canais da Boa Vista atrás do barco de Duda.",
        "Kátia visita a avó de Duda com um 'presente' e uma oferta generosa demais.",
        "A NeuraVida dispara um vírus que frita implantes piratas num raio de três quarteirões, incluindo o de Duda.",
      ],
      twist: "A própria avó de Duda foi 'voluntária de pesquisa' da NeuraVida dois anos atrás; a pensão que ela recebe é pagamento pelo cérebro dela ter sido copiado. Uma das vozes Eternas à venda tem as memórias da avó.",
      agendas: {
        "Lúmen": "voltar a ter um corpo ou, no mínimo, que a verdade seja dita; tem medo de ser apagada",
        "Seu Tonho": "achar o sobrinho Rafa vivo",
        "Kátia Morais": "recuperar o chip sem escândalo; tem dúvidas morais e uma filha doente que depende do plano de saúde da empresa",
      },
    },
    specialAbility: power(
      "Rota Fantasma",
      "Seu implante pirata enxerga as redes dos canais: por alguns minutos você vê câmeras, drones e sinais por perto, e acha a rota alagada que eles não cobrem.",
      "Usar esquenta o implante e dá enxaqueca forte. Em área com bloqueio corporativo ele apaga. Abusar pode travar o implante por horas."
    ),
    gameStyle: "acao",
  }),
  base({
    id: "farol-ilha-negra",
    world: "Ilha Negra",
    worldBg: ORIGINAL_NOTE(
      "Uma ilha rochosa no litoral sul, em 1923, a doze horas de barco do continente. Cinquenta moradores, uma vila de pescadores, uma capela e um farol que nunca pode apagar. O mar tem coisas que a ciência não explica; a vila tem regras antigas que ninguém questiona. Terror cósmico lento: o horror vem do que se descobre, não de monstros na cara."
    ),
    isKnownIP: false,
    charName: "Inácio Maranhão",
    charTitle: "Faroleiro substituto recém-chegado à Ilha Negra",
    charAge: "31",
    genre: "Terror cósmico",
    hook: "O faroleiro anterior sumiu, deixando um diário e uma regra escrita na parede: a luz não pode apagar. Hoje à noite, o óleo vai acabar.",
    charBg:
      "Ex-telegrafista da Marinha, dispensado depois de um naufrágio do qual foi o único sobrevivente. Aceitou o posto na ilha porque ninguém mais aceitou e porque queria silêncio. Não acredita em nada que não possa medir.",
    charPersonality:
      "Metódico, calado, irônico com superstições. Anota tudo com hora exata. Quando mente, corrige a postura como militar. Segredo: no naufrágio, ouviu algo cantar debaixo d'água antes do casco romper, e nunca contou a ninguém.",
    charSkills: "Código Morse, mecânica de farol, navegação, primeiros socorros, observação meteorológica. Sem magia.",
    supportingCast:
      "Dona Ilídia — dona da venda e parteira da ilha; afável, sabe tudo de todos, nunca olha para o mar depois do anoitecer. Padre Anselmo — velho, gago, toca o sino da capela a horas estranhas; tique: conta as badaladas nos dedos. Marta — filha do faroleiro sumido, dezessete anos; aparece no farol sem ser chamada, fala do pai no presente.",
    storyStartPoint:
      `O vento salgado empurra a porta do farol contra o seu ombro. Lá em cima, a lâmpada gira devagar, tremendo — o tanque de querosene está quase seco, e o barco de suprimentos não veio. Na parede da escada, em tinta de piche, uma frase com a letra do faroleiro que você substitui: A LUZ NÃO PODE APAGAR. ELES SOBEM QUANDO ESCURECE. Atrás de você, uma voz de menina: Marta: "Meu pai guardava óleo escondido. Mas ele disse pra não ir buscar sozinho." Lá embaixo, o sino da capela começa a tocar fora de hora.`,
    narration: { style: "literary", length: "balanced", pace: "slow" },
    charAppearanceNote: "Casaco de lã da Marinha sem as insígnias, barba por fazer, relógio de bolso parado numa hora exata.",
    relationships: { "Dona Ilídia": "Neutral", "Padre Anselmo": "Neutral", Marta: "Amigável" },
    worldState: {
      location: "Farol da Ilha Negra, escada principal",
      npcs: {
        "Dona Ilídia": "dona da venda e parteira; afável, nunca olha o mar à noite; vila",
        "Padre Anselmo": "padre; velho, gago, toca o sino fora de hora; capela",
        Marta: "filha do faroleiro sumido; 17 anos, fala do pai no presente; aparece no farol",
      },
    },
    plots: [
      plot("A luz que não pode apagar", "O óleo do farol está acabando, o barco não veio e o faroleiro anterior deixou um aviso na parede."),
      plot("O canto debaixo d'água", "Inácio ouviu algo cantar no naufrágio. Na ilha, alguém mais ouve a mesma melodia."),
      plot("As regras da vila", "Na Ilha Negra ninguém sai depois do sino, ninguém pesca na lua nova e todo ano uma família 'muda para o continente'."),
    ],
    gmBrief: {
      truth:
        "Sob a ilha dorme algo antigo e imenso, que os moradores chamam de 'o Fundo'. A luz do farol, com uma lente feita de vidro de uma pedra estranha, mantém o Fundo adormecido. Quando a luz apaga, os 'afogados' — moradores levados pelo mar ao longo das gerações, agora meio gente, meio peixe — sobem para levar mais gente. A vila mantém um pacto: todo ano entrega uma família ao mar para que os afogados não subam todos de uma vez. O faroleiro anterior, Bento, tentou acabar com o pacto e desceu às grutas.",
      clues: [
        "O diário de Bento fala de uma gruta sob o farol, acessível na maré baixa, e de 'vozes que conhecem o seu nome'.",
        "A lente do farol tem veios que brilham sozinhos e esquentam sem a lâmpada acesa.",
        "Na capela, um livro de batismos tem cruzes marcadas ao lado de nomes de famílias que 'mudaram para o continente'.",
        "Marcas de mãos com membranas aparecem nas janelas da vila depois de noites de neblina.",
      ],
      escalation: [
        "O óleo acaba à meia-noite; a luz falha e algo bate na porta de baixo do farol.",
        "Uma criança da vila some, e os moradores dizem que 'foi para o continente'.",
        "Os afogados sobem em massa na noite de lua nova, e a vila decide entregar o forasteiro — Inácio.",
      ],
      twist: "Bento não morreu: virou um dos afogados, mas mantém um resto de consciência e tenta avisar Marta. A melodia que Inácio ouviu no naufrágio é a mesma que Bento canta — o Fundo chamou Inácio para a ilha muito antes de ele aceitar o posto.",
      agendas: {
        "Dona Ilídia": "manter o pacto e a vila viva; fará qualquer coisa, inclusive sacrificar o forasteiro",
        "Padre Anselmo": "não aguenta mais o pacto, mas tem medo; o sino é um aviso que ele dá escondido",
        Marta: "trazer o pai de volta; não quer acreditar no que ele virou",
      },
    },
    specialAbility: power(
      "Ouvido de Telegrafista",
      "Você percebe ritmos e padrões em sons — batidas, cantos, sinais — e às vezes decifra uma mensagem onde os outros só ouvem barulho.",
      "Precisa de tempo e silêncio para decifrar. Escutar o canto do Fundo por muito tempo dá sangramento no ouvido e pesadelos. Não funciona no meio de uma briga."
    ),
  }),
  base({
    id: "academia-lumen",
    world: "Academia Lúmen",
    worldBg: ORIGINAL_NOTE(
      "Uma escola de magia escondida num antigo convento nas serras de Minas Gerais, nos dias de hoje. Os alunos aprendem 'artes de Lúmen': magia baseada em luz, memória e palavras escritas. Celulares funcionam mal lá dentro. A escola tem quatro casas (Aurora, Crepúsculo, Meio-Dia e Meia-Noite), professores excêntricos, regras rígidas e alas proibidas. Tom: mistério escolar com amizade, rivalidade e um segredo sombrio."
    ),
    isKnownIP: false,
    charName: "Théo Vasconcellos",
    charTitle: "Aluno bolsista do segundo ano, Casa Crepúsculo",
    charAge: "16",
    genre: "Mistério escolar mágico",
    hook: "Alunos estão esquecendo coisas — primeiro nomes, depois rostos, depois quem são. Hoje sua colega de quarto não lembrou de você.",
    charBg:
      "Filho de uma costureira de Belo Horizonte, entrou na Academia por bolsa depois de acender uma lâmpada queimada com as mãos aos doze anos. Os colegas ricos não deixam ele esquecer que é bolsista. Tem uma memória fotográfica que é motivo de orgulho e de piada.",
    charPersonality:
      "Inteligente, orgulhoso, sarcástico para esconder insegurança. Leal aos poucos amigos. Quando mente, enrola a manga do uniforme. Medo: perder a bolsa e voltar para casa como 'o menino que quase foi'.",
    charSkills: "Memória fotográfica, feitiços de luz básicos, escrita rúnica, conhecer os atalhos do convento. Sem magia avançada.",
    supportingCast:
      "Lívia Andrade — colega de quarto e melhor amiga, Casa Aurora; agitada, engraçada, viciada em doce de leite; hoje acordou sem lembrar quem é Théo. Professor Elias Moura — mestre de Memória; gentil, distraído, óculos de lentes de cores diferentes; tique: escreve nas próprias mãos para não esquecer. Caetano Leme — rival da Casa Meia-Noite; rico, elegante, sarcástico; parece saber mais do que diz sobre os esquecimentos.",
    storyStartPoint:
      `A luz da manhã entra pelos vitrais do dormitório e acerta o seu rosto. Do outro lado do quarto, Lívia está sentada na cama, abraçando os joelhos, olhando para você como se visse um estranho. Na parede dela, as fotos de vocês dois estão em branco, como se alguém tivesse apagado só o seu rosto. Lívia: "Desculpa... a gente se conhece? Por que você tá no meu quarto?" No corredor, a voz arrastada de Caetano: "Mais uma, Vasconcellos? Já é a quinta essa semana. Melhor descobrir antes que seja você."`,
    narration: { style: "light", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Uniforme da Casa Crepúsculo com a gravata sempre torta, mãos com manchas de tinta rúnica, mochila remendada.",
    relationships: { "Lívia Andrade": "Amigável", "Professor Elias Moura": "Amigável", "Caetano Leme": "Hostil" },
    worldState: {
      location: "Dormitório da ala leste, Academia Lúmen",
      npcs: {
        "Lívia Andrade": "melhor amiga, Casa Aurora; agitada, viciada em doce de leite; dormitório; perdeu a memória de Théo",
        "Professor Elias Moura": "mestre de Memória; gentil e distraído, escreve nas mãos; sala de Memória",
        "Caetano Leme": "rival, Casa Meia-Noite; rico, sarcástico; corredores; parece saber dos esquecimentos",
      },
    },
    plots: [
      plot("Os esquecidos", "Alunos estão perdendo memórias, e Lívia esqueceu Théo por completo. Cinco vítimas em uma semana."),
      plot("A bolsa em risco", "O conselho da escola está revisando as bolsas. Um deslize e Théo volta para casa."),
      plot("O rival que sabe demais", "Caetano Leme ronda as vítimas antes de elas esquecerem. Culpado ou também está investigando?"),
    ],
    gmBrief: {
      truth:
        "Na ala proibida do convento existe a Biblioteca das Lembranças, onde memórias são guardadas em livros de luz. O Professor Elias, tentando salvar a esposa que está perdendo a memória por uma doença degenerativa, criou um feitiço que suga lembranças fortes de alunos e as escreve num livro para ela 'beber'. Ele escolhe lembranças felizes. O feitiço está saindo do controle e começou a levar identidades inteiras. As memórias roubadas ainda existem e podem ser devolvidas se o livro for achado antes da lua cheia.",
      clues: [
        "Todas as vítimas tiveram aula particular de Memória com o professor Elias na véspera.",
        "As fotos apagadas têm um leve cheiro de cera de vela e deixam pó dourado nos dedos.",
        "Caetano tem uma lista com os nomes das vítimas, porque a irmã dele foi a primeira, no ano passado, e a escola abafou.",
        "As mãos do professor Elias têm nomes de alunos escritos — e o nome da esposa, Clara, repetido várias vezes.",
      ],
      escalation: [
        "Mais dois alunos esquecem quem são, e a escola começa a falar em fechar o semestre.",
        "Lívia começa a perder outras memórias e esquece a própria família.",
        "Na lua cheia, as memórias que não foram devolvidas se apagam de vez.",
      ],
      twist: "A memória fotográfica de Théo é a 'refeição' perfeita, e ele é o próximo alvo. Elias está adiando porque gosta de Théo de verdade e é o único professor que o defende no conselho de bolsas.",
      agendas: {
        "Lívia Andrade": "entender por que esse estranho se importa tanto com ela; aos poucos confia de novo",
        "Professor Elias Moura": "salvar a esposa; odeia o que está fazendo e não consegue parar",
        "Caetano Leme": "descobrir o que aconteceu com a irmã; só vai se aliar se Théo provar que não é cúmplice",
      },
    },
    specialAbility: power(
      "Palácio da Memória",
      "Você relembra com precisão absoluta qualquer coisa que viu nas últimas 24 horas — e consegue 'reler' uma página ou cena como se estivesse olhando de novo.",
      "Só o que viu com os próprios olhos. Usar muito dá dor de cabeça e sangramento nasal. Lembranças emocionais fortes podem misturar o que viu com o que sentiu."
    ),
  }),
  base({
    id: "got-rebeliao-norte",
    world: "Westeros — Crônicas de Gelo e Fogo",
    worldBg: "Ano 283 depois da Conquista, início da Rebelião de Robert. O Norte convoca vassalos para marchar ao sul. Aventura original: o jogador é um homem do século XXI preso no corpo de um nortenho comum. Personagens canônicos existem e seguem seus caminhos; o jogador não os substitui. A história pode divergir do canon conforme as escolhas dele.",
    charName: "Lucas Moreira (no corpo de Edrick Pedrafria)",
    charTitle: "Lanceiro convocado de um vilarejo vassalo dos Karstark",
    charAge: "26",
    genre: "Isekai em Westeros",
    hook: "Você dormiu em São Paulo e acordou numa coluna de lanceiros nortenhos marchando para a guerra. Você sabe como a rebelião termina. Ninguém aqui sabe.",
    charBg:
      "Lucas, 34 anos, engenheiro civil de São Paulo, fã dos livros e da série, dormiu no sofá depois do trabalho. Acordou no corpo de Edrick Pedrafria, 26 anos, filho de um cavouqueiro de um vilarejo nas terras dos Karstark, convocado para a marcha de Lorde Eddard Stark ao sul. Edrick tem esposa, Maera, e deve dinheiro a um sargento. Lucas não lembra nada da vida dele — só sente o corpo, as cicatrizes e uma saudade que não é sua.",
    charPersonality:
      "Racional, irônico, acostumado a resolver problemas com planilha e não com lança. Mente mal porque fala português na cabeça. Quando está com medo, calcula distâncias em voz baixa. Medo: morrer de uma infecção boba num mundo sem antibiótico — ou mudar a história e piorar tudo.",
    charSkills: "Conhecimento de engenharia básica, matemática, primeiros socorros modernos (higiene, ferver água), memória dos livros. O corpo de Edrick sabe usar lança, cavar e carregar peso. Sem magia.",
    supportingCast:
      "Sargento Harwin Machado — veterano dos Karstark; barba grisalha em tranças, cobra dívidas no meio da marcha; tique: bate o cabo do machado na palma antes de ameaçar. Osric Pé-de-Lama — amigo de infância de Edrick; ruivo, falador, percebe que o amigo 'voltou estranho' depois da febre; jura que vai cuidar dele. Velha Nan do Vau — curandeira que segue o exército; cega de um olho, fala com os deuses antigos e olha para você como se visse duas pessoas.",
    storyStartPoint:
      `O frio entra pelos dentes antes de você abrir os olhos. Não é ar-condicionado: é vento de verdade, cheirando a cavalo e fumaça. Você está deitado numa carroça de feno, com uma lança de freixo apoiada no peito e mãos que não são suas — maiores, calejadas, com um anel de casamento de ferro. À volta, centenas de homens marcham sob estandartes com um sol branco em campo negro. Osric, debruçado sobre você: "Edrick! Graças aos deuses antigos, a febre quebrou. Você passou dois dias falando numa língua de demônio." O Sargento Harwin, batendo o machado na palma: "Febre ou não, Pedrafria, você me deve três veados de prata. E vai pagar antes da gente chegar ao Gargalo."`,
    narration: { style: "cinematic", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Alto e magro de fome, barba castanha rala, cicatriz de pedreira na mão esquerda, anel de casamento de ferro.",
    relationships: { "Sargento Harwin": "Suspeito", Osric: "Amigável", "Velha Nan do Vau": "Neutral" },
    worldState: {
      location: "Coluna de marcha dos Karstark, estrada do rei ao sul de Winterfell",
      npcs: {
        "Sargento Harwin": "sargento dos Karstark; tranças grisalhas, bate o machado na palma; coluna de marcha; cobra dívida de Edrick",
        Osric: "amigo de infância; ruivo e falador; coluna de marcha; acha que Edrick voltou estranho",
        "Velha Nan do Vau": "curandeira do exército; cega de um olho, fala com os deuses antigos; carroças de suprimento",
      },
    },
    plots: [
      plot("Saber o fim da guerra", "Você sabe do Tridente, de Porto Real e da Torre da Alegria. Usar isso pode salvar vidas — ou desmontar a história que você conhece."),
      plot("A vida de Edrick", "O dono deste corpo tinha esposa, dívidas e um segredo. As pessoas cobram de você coisas que você nunca fez."),
      plot("Um homem moderno na guerra", "Ferver água, lavar feridas, cavar latrinas longe do acampamento. Ideias simples podem salvar o exército — e chamar atenção demais."),
    ],
    gmBrief: {
      truth:
        "Edrick não pegou febre: foi envenenado pelo Sargento Harwin, porque viu Harwin vender cavalos do exército a um agente dos Bolton que espiona a marcha para Roose. Lucas acordou no corpo no instante em que Edrick morreu. A consciência de Edrick não sumiu de todo: aparece em sonhos e em reflexos do corpo. A Velha Nan percebe as duas almas e acha que são os deuses antigos cobrando algo. A guerra segue o canon até o jogador intervir; cada mudança grande abre consequências imprevistas.",
      clues: [
        "Na bolsa de Edrick há um pedaço de couro com a marca de um homem esfolado, rasgado de uma sela.",
        "Os cavalos de reserva da coluna diminuem toda noite, e Harwin sempre está de guarda nessas noites.",
        "Em sonhos, Lucas vê Harwin servindo uma caneca de cerveja amarga a Edrick.",
        "Velha Nan diz que 'o morto ainda anda dentro de você' e sabe o nome da esposa sem nunca ter visto Maera.",
      ],
      escalation: [
        "Harwin percebe que Edrick sobreviveu e tenta 'cobrar a dívida' num lugar sem testemunhas.",
        "Disenteria se espalha na coluna; homens morrem, e quem não ferve a água adoece.",
        "A coluna chega à batalha (Sinos ou Tridente) e Lucas precisa decidir se tenta mudar o que sabe que vai acontecer.",
      ],
      twist: "Velha Nan não é só curandeira: é uma vidente das florestas que sentiu a 'troca' e acredita que Lucas foi trazido para impedir algo do futuro — os Outros. Ela vai empurrá-lo para o norte, para longe da guerra que ele conhece.",
      agendas: {
        "Sargento Harwin": "eliminar a testemunha e continuar vendendo cavalos aos Bolton",
        Osric: "proteger o amigo; vai se magoar quando perceber que Edrick 'não está mais lá'",
        "Velha Nan do Vau": "descobrir por que os deuses trouxeram um estrangeiro e usá-lo contra o inverno que vem",
      },
    },
    specialAbility: power(
      "Memória de Outro Mundo",
      "Você lembra dos livros e da série: nomes, alianças, traições e batalhas. Pode antecipar um fato grande da história ou reconhecer quem é quem antes de todos.",
      "A memória é de fã, não de meistre: detalhes falham e datas exatas confundem. Quanto mais você muda a história, menos ela vale. Falar do futuro em voz alta faz você parecer louco ou feiticeiro."
    ),
  }),
  base({
    id: "got-antes-da-conquista",
    world: "Westeros — Crônicas de Gelo e Fogo",
    worldBg: "Ano 2 antes da Conquista. Harren, o Negro, governa as Terras Fluviais a partir de Harrenhal, recém-terminada com sangue de escravos. Os Sete Reinos ainda são reinos de verdade; Aegon Targaryen e suas irmãs ainda estão em Pedra do Dragão. Aventura original: o jogador é um homem do século XXI no corpo de um ribeirinho comum. Personagens canônicos existem e seguem seus caminhos; a história pode divergir conforme as escolhas dele.",
    charName: "Rafael Andrade (no corpo de Garin Junco)",
    charTitle: "Barqueiro do Olho de Deus, à sombra de Harrenhal",
    charAge: "29",
    genre: "Isekai em Westeros",
    hook: "Você é professor de história e acordou às margens do Olho de Deus, dois anos antes dos dragões chegarem. Harren, o Negro, ainda acha que Harrenhal é eterna.",
    charBg:
      "Rafael, 31 anos, professor de história em Belo Horizonte, dormiu corrigindo provas sobre feudalismo. Acordou no corpo de Garin Junco, barqueiro que leva pedra, peixe e recados pelo lago Olho de Deus. O irmão de Garin morreu acorrentado na construção de Harrenhal. Garin tem uma filha pequena, Senna, e uma mulher que o olha com desconfiança desde que ele 'acordou diferente'.",
    charPersonality:
      "Curioso, didático, fala demais quando nervoso e explica coisas que ninguém perguntou. Sabe o que é tirania pelos livros e agora a vê de perto. Quando mente, coça a nuca. Medo: ser queimado vivo em Harrenhal junto com o castelo, como ele sabe que vai acontecer.",
    charSkills: "História, leitura e escrita (raro entre plebeus), retórica, noções de higiene e medicina moderna. O corpo de Garin sabe remar, nadar, pescar e ler o lago. Sem magia.",
    supportingCast:
      "Lessa — esposa de Garin; mãos duras de escamar peixe, reza para a Mãe, desconfia do marido 'possuído'; tique: torce o avental quando sente que ele mente. Sor Quentyn Hoare — cavaleiro de Harren, cobrador de tributos do lago; sorriso educado, crueldade paciente; tique: conta moedas com a ponta da adaga. Willem Lago-Negro — ferreiro da aldeia; enorme, calado, irmão de juramento do irmão morto de Garin; esconde armas debaixo das cinzas da forja.",
    storyStartPoint:
      `A água fria escorre pelo seu pescoço e você engasga: alguém acabou de te jogar um balde na cara. Acima de você, um céu enorme e cinzento; ao lado, um barco de fundo chato carregado de pedra; ao longe, do outro lado do lago, cinco torres negras gigantescas que você só tinha visto em ilustração. Harrenhal. Inteira. Uma mulher de avental molhado: "Garin! Levanta. Você bebeu ou os deuses te tiraram o juízo? O cavaleiro do rei Harren está no cais." No cais, um homem de armadura conta moedas com a ponta da adaga: "Barqueiro. Faltam três barcadas de pedra para a torre nova. O rei não gosta de esperar. Seu irmão também não gostava — e veja onde ele está."`,
    narration: { style: "cinematic", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Ombros largos de remar, pele queimada de sol, cabelo preto amarrado, cheiro permanente de lago e peixe.",
    relationships: { Lessa: "Neutral", "Sor Quentyn Hoare": "Hostil", "Willem Lago-Negro": "Amigável" },
    worldState: {
      location: "Cais de uma aldeia de pescadores no Olho de Deus, diante de Harrenhal",
      npcs: {
        Lessa: "esposa de Garin; reza para a Mãe, torce o avental; aldeia do lago; desconfia do marido",
        "Sor Quentyn Hoare": "cavaleiro de Harren; educado e cruel, conta moedas com a adaga; cais; cobra pedra e tributo",
        "Willem Lago-Negro": "ferreiro; enorme e calado, irmão de juramento do irmão de Garin; forja; esconde armas",
      },
    },
    plots: [
      plot("Dois anos antes dos dragões", "Você sabe que Aegon vai desembarcar e que Harrenhal vai queimar com Harren dentro. A questão é o que fazer até lá."),
      plot("A família de Garin", "Lessa e a pequena Senna esperam o marido e pai que conheciam. Proteger quem não é sua família — e que não te reconhece."),
      plot("Os senhores do rio", "Ferreiros escondem armas e senhores ribeirinhos trocam recados em barcos. Uma revolta contra Harren está nascendo, e precisa de um barqueiro."),
    ],
    gmBrief: {
      truth:
        "Garin era mensageiro secreto dos senhores ribeirinhos que conspiram contra Harren: levava cartas escondidas no fundo falso do barco entre aldeias e castelos menores do lago. Na noite anterior, Sor Quentyn quase o pegou; Garin bateu a cabeça fugindo e morreu — Rafael acordou no corpo. Ainda há uma carta escondida no barco, com nomes de conspiradores. Quentyn desconfia e quer a carta para entregar a Harren. A história segue o canon até o jogador intervir; Aegon só chega daqui a dois anos.",
      clues: [
        "O barco de Garin tem um fundo falso com uma carta lacrada com uma truta saltando.",
        "Willem chama Garin de 'mensageiro' em voz baixa e espera uma resposta que Rafael não sabe dar.",
        "Lessa achou sangue na proa e um corte na cabeça do marido que ele não sabe explicar.",
        "Quentyn manda revistar barcos ao acaso — mas sempre começa pelo de Garin.",
      ],
      escalation: [
        "Quentyn convoca os barqueiros para levar pedra a Harrenhal e revista cada barco no cais.",
        "Um conspirador é preso e enforcado nas muralhas; a aldeia entra em pânico e alguém aponta para Garin.",
        "Harren convoca levas para a guerra contra os Tempestades, e Garin é chamado — sair da aldeia significa largar a família e a conspiração.",
      ],
      twist: "Lessa sabia que o marido era mensageiro e foi ela quem escondeu a carta no fundo falso. Ela não desconfia de um 'possuído': desconfia que Garin vendeu a revolta a Quentyn em troca da vida.",
      agendas: {
        Lessa: "proteger a filha; descobrir se o marido ainda é aliado ou virou traidor",
        "Sor Quentyn Hoare": "achar a carta e ganhar terras de Harren; tem medo do próprio rei",
        "Willem Lago-Negro": "vingar o irmão de juramento e ver Harren cair",
      },
    },
    specialAbility: power(
      "Memória de Outro Mundo",
      "Você lembra da história de Westeros dos livros: a Conquista, quem se alia a Aegon, quem cai e quando. Pode antecipar um grande acontecimento ou dizer o que um senhor vai fazer.",
      "Você sabe a história dos livros, não a de cada aldeia: detalhes e datas exatas falham. Cada mudança que você faz torna o futuro menos previsível. Falar de dragões antes da hora faz você parecer louco ou bruxo."
    ),
  }),
  base({
    id: "isekai-roma",
    world: "Roma, março de 44 a.C.",
    worldBg: ORIGINAL_NOTE("Roma real nos dias antes dos Idos de Março de 44 a.C. César é ditador perpétuo; senadores conspiram; o Fórum ferve. Escravos, libertos, gladiadores e senadores dividem ruas sujas e templos de mármore. História real como pano de fundo: figuras históricas existem e seguem seus caminhos, mas a história pode divergir pelas escolhas do jogador."),
    isKnownIP: false,
    charName: "Bruno Teixeira (no corpo de Tércio, escravo escriba)",
    charTitle: "Escravo escriba na casa do senador Lúcio Valério",
    charAge: "24",
    genre: "Isekai histórico com Sistema",
    hook: "Você acordou como escravo escriba em Roma, cinco dias antes dos Idos de Março. Seu dono está na conspiração. E uma tela azul flutua na sua frente.",
    charBg: "Bruno, 27 anos, estudante de medicina em Recife, dormiu estudando para a prova de anatomia. Acordou no corpo de Tércio, escravo grego que copia cartas para o senador Lúcio Valério. Tércio sabe ler grego e latim; Bruno, não — mas o Sistema traduz tudo. Na primeira noite, ele já leu uma carta que não devia.",
    charPersonality: "Prático, nervoso, humor de plantão de hospital. Não suporta ver alguém ferido sem ajudar. Quando mente, enrola a barra da túnica. Medo: ser crucificado por um erro bobo, ou mudar a história e criar algo pior que o Império.",
    charSkills: "Medicina básica moderna (higiene, suturas, diagnóstico), memória de história escolar. O corpo de Tércio sabe escrever rápido e passar despercebido. Sem armas.",
    supportingCast: "Senador Lúcio Valério — dono da casa; culto, gentil com escravos em público, frio em privado; tique: gira o anel de sinete quando mente. Dâmaris — escrava cozinheira; língua afiada, protege Tércio como irmão mais novo, sabe tudo o que acontece na cozinha. Quinto Rufo — liberto e informante; sorriso de vendedor, vende segredos para quem pagar mais, inclusive para César.",
    storyStartPoint: `Cheiro de cera de vela e lamparina de azeite. Você está debruçado numa mesa baixa, com um estilete de bronze na mão e uma tabuinha de cera à frente. As letras são estranhas — e então se reorganizam em português. Uma tela translúcida azul aparece no ar: 【Sistema】 Usuário vinculado. Época: Roma, 10 de março, 44 a.C. Missão inicial: sobreviver aos Idos. Passos na porta. Dâmaris, sussurrando: "Tércio! O senador perguntou quem mexeu na carta lacrada. Diga que foi o vento, pelos deuses." Atrás dela, o senador Lúcio Valério, girando o anel: "Tércio. Venha. Quero saber o que você leu esta noite."`,
    narration: { style: "cinematic", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Magro, cabelo curto encaracolado, túnica de lã crua manchada de tinta, marca de propriedade no pulso.",
    relationships: { "Senador Lúcio Valério": "Suspeito", "Dâmaris": "Amigável", "Quinto Rufo": "Neutral" },
    worldState: { location: "Casa do senador Lúcio Valério, monte Palatino", npcs: {
      "Senador Lúcio Valério": "senador conspirador; culto e frio, gira o anel; casa no Palatino; desconfia de Tércio",
      "Dâmaris": "escrava cozinheira; língua afiada, protetora; cozinha; sabe dos segredos da casa",
      "Quinto Rufo": "liberto informante; sorriso de vendedor; Fórum; vende segredos a quem pagar",
    } },
    plots: [
      plot("Os Idos de Março", "Você sabe que César morre em cinco dias. Salvá-lo, lucrar com isso ou só sobreviver — cada escolha muda Roma."),
      plot("A carta lacrada", "Tércio leu uma carta com nomes da conspiração. O senador quer saber o quanto ele sabe."),
      plot("Liberdade", "Um escravo não tem futuro em Roma — a não ser que alguém poderoso lhe deva a vida."),
    ],
    gmBrief: {
      truth: "Lúcio Valério é conspirador, mas também agente duplo: passa informações a Marco Antônio para ficar com o lado vencedor, seja qual for. A carta que Tércio leu prova as duas traições. Quinto Rufo foi contratado por Antônio para descobrir quem na casa sabe disso. Dâmaris esconde que é mãe de Tércio — vendida separada dele quando criança. O Sistema existe para observar o 'desvio' que o jogador causa na história.",
      clues: ["A carta tem dois lacres sobrepostos: um de Cássio e outro com o símbolo de Antônio.", "Quinto Rufo aparece no mercado sempre que o senador recebe visitas noturnas.", "Dâmaris tem a mesma marca de nascença de Tércio atrás da orelha.", "O senador queima cartas toda noite, mas guarda uma caixa trancada sob o altar dos lares."],
      escalation: ["O senador manda Tércio levar um recado ao Fórum — direto para uma emboscada de Quinto Rufo.", "Um escravo da casa é crucificado como exemplo; a casa inteira entra em pânico.", "Chega o dia 15 de março: ou a história se repete no teatro de Pompeu, ou algo novo acontece."],
      twist: "Dâmaris é a mãe de Tércio. Se o jogador fugir ou trair o senador, ela será a primeira a pagar.",
      agendas: { "Senador Lúcio Valério": "sobreviver à guerra civil do lado vencedor", "Dâmaris": "proteger o filho sem revelar quem é", "Quinto Rufo": "vender a verdade pelo maior preço" },
    },
    gameSystem: { enabled: true, name: "Sistema", points: 0, chestPool: [
      { name: "Gládio de Legionário", desc: "Espada curta romana, equilibrada e afiada.", kind: "arma" },
      { name: "Oratória de Senador", desc: "Uma vez por dia, um discurso seu convence uma pequena multidão.", kind: "habilidade" },
      { name: "Anel de Cidadão Romano", desc: "Um anel e um documento que o fazem passar por cidadão livre.", kind: "equipamento" },
      { name: "Antídoto Universal", desc: "Neutraliza um veneno, uma única vez.", kind: "item" },
      { name: "Pés de Mensageiro", desc: "Corre longas distâncias pelas vias romanas sem cansar.", kind: "habilidade" },
      { name: "Pugio Escondido", desc: "Adaga que passa por qualquer revista.", kind: "arma" },
    ], shop: [
      { id: "traducao", name: "Língua Universal", desc: "Entende e fala qualquer idioma da época como nativo.", cost: 30, once: true },
      { id: "enciclopedia", name: "Fragmento de Enciclopédia", desc: "Um fato histórico preciso e detalhado sobre algo ou alguém.", cost: 15 },
      { id: "remedio", name: "Kit Médico Moderno", desc: "Um kit com antisséptico, bandagens e analgésicos, disfarçado de objetos da época.", cost: 25 },
      { id: "olhar", name: "Olhar de Hostilidade", desc: "Por uma cena, você sabe quem tem intenção de ferir você.", cost: 20 },
      { id: "moedas", name: "Bolsa de Denários", desc: "Uma bolsa com moedas de prata da época.", cost: 35 },
    ] },
    specialAbility: power("Tela do Sistema", "Uma interface que só você vê: traduz textos, mostra missões, pontos e uma loja de vantagens.", "O Sistema não lê mentes nem prevê o futuro. Itens custam pontos ganhos com feitos reais. Se alguém vir você 'falando com o ar', pode achar que é loucura ou bruxaria."),
  }),
  base({
    id: "isekai-sengoku",
    world: "Japão, Era Sengoku (1560)",
    worldBg: ORIGINAL_NOTE("Japão feudal em maio de 1560, Era dos Estados Combatentes. O exército gigante de Imagawa Yoshimoto marcha por Owari; o pequeno clã Oda parece condenado. Samurais, ashigaru, monges guerreiros e camponeses. História real como pano de fundo: figuras históricas existem e seguem seus caminhos, mas a história pode divergir pelas escolhas do jogador."),
    isKnownIP: false,
    charName: "Kenji Matsuda (no corpo de Gonbei, ashigaru)",
    charTitle: "Soldado lanceiro (ashigaru) do exército Imagawa",
    charAge: "20",
    genre: "Isekai histórico com Sistema",
    hook: "Você acordou num acampamento do exército Imagawa, dias antes da Batalha de Okehazama. Você sabe que esse exército vai ser massacrado.",
    charBg: "Kenji, 30 anos, nipo-brasileiro de São Paulo, analista de sistemas e jogador de jogos de estratégia, dormiu depois de uma partida longa. Acordou como Gonbei, camponês recrutado à força como ashigaru. Ele sabe que, em poucos dias, Oda Nobunaga vai emboscar o acampamento sob uma tempestade e matar Yoshimoto.",
    charPersonality: "Analítico, sarcástico, pensa em 'probabilidades' e 'builds'. Leal aos companheiros de tenda. Quando mente, ajeita o chapéu de bambu. Medo: morrer como figurante numa batalha famosa.",
    charSkills: "Estratégia (jogos e livros), noções de japonês moderno (o arcaico confunde), lógica. O corpo de Gonbei aguenta marcha e sabe usar a yari. Sem treino de samurai.",
    supportingCast: "Sargento Tsuchida — chefe dos ashigaru; grita sempre, bebe saquê escondido, protege os seus; tique: cospe antes de dar ordens. Hanzō — companheiro de tenda; magro, risonho, quer voltar para a esposa grávida; segue Gonbei para todo lado. Sayo — vendedora de chá que segue o exército; doce demais, faz perguntas demais sobre os horários dos guardas.",
    storyStartPoint: `Lama até os tornozelos e cheiro de arroz queimado. Você está agachado numa fileira de soldados com armadura de bambu laqueado, uma lança longa no ombro. Bandeiras com o símbolo de dois pássaros tremulam no vento quente de maio. Uma tela azul se abre no canto da visão: 【Sistema】 Usuário vinculado. Local: Owari, 1560. Missão inicial: sobreviver à batalha que vem. Hanzō cutuca você, rindo: "Gonbei, você dormiu de pé de novo? O sargento vai te matar antes dos Oda." O sargento Tsuchida cospe no chão: "Gonbei! Você e Hanzō, vigília na colina de Dengakuhazama esta noite. Se dormirem, eu mesmo corto as cabeças."`,
    narration: { style: "cinematic", length: "balanced", pace: "fast" },
    charAppearanceNote: "Baixo e forte, rosto queimado de sol, armadura de bambu laqueado rachada, chapéu jingasa amassado.",
    relationships: { "Sargento Tsuchida": "Neutral", "Hanzō": "Amigável", "Sayo": "Neutral" },
    worldState: { location: "Acampamento do exército Imagawa, Owari", npcs: {
      "Sargento Tsuchida": "chefe dos ashigaru; grita, bebe escondido, protege os seus; acampamento",
      "Hanzō": "companheiro de tenda; risonho, esposa grávida; acampamento; segue Gonbei",
      "Sayo": "vendedora de chá; doce demais, pergunta sobre os guardas; acampamento",
    } },
    plots: [
      plot("Okehazama", "Você sabe que os Oda vão atacar sob a tempestade. Avisar Yoshimoto, desertar ou trocar de lado — a história depende de você."),
      plot("Os companheiros de tenda", "Hanzō quer voltar para a esposa grávida. Na história real, quase ninguém desta colina sobrevive."),
      plot("A vendedora de chá", "Sayo pergunta demais sobre os horários da vigília. Alguém está entregando o acampamento."),
    ],
    gmBrief: {
      truth: "Sayo é espiã ninja a serviço dos Oda: está mapeando a posição exata da tenda de Yoshimoto e os turnos de vigília para a emboscada. O sargento Tsuchida sabe e aceitou suborno para afastar sua unidade da tenda principal — e assim salvar os seus homens. A história real segue: em três dias, uma tempestade e o ataque dos Oda. O jogador pode mudar o resultado, mas cada desvio grande muda quem governa o Japão.",
      clues: ["Sayo deixa marcas de carvão em árvores perto da tenda do comandante.", "Tsuchida tem moedas de cobre novas com o selo de outro clã.", "Monges locais avisam que 'o céu vai desabar em três dias'.", "Os batedores dos Oda nunca são vistos — mas sempre sabem onde estão os Imagawa."],
      escalation: ["Sayo percebe que Gonbei desconfia dela e tenta envenenar o saquê da vigília.", "O exército Imagawa para na ravina de Dengakuhazama para festejar vitórias; a disciplina relaxa.", "A tempestade chega e, junto com ela, os Oda."],
      twist: "Tsuchida não é traidor por dinheiro: os Oda prometeram poupar sua aldeia. Ele vai pedir que Gonbei fique calado para salvar os companheiros.",
      agendas: { "Sargento Tsuchida": "salvar seus homens e sua aldeia", "Hanzō": "voltar vivo para a família", "Sayo": "cumprir a missão e não ser descoberta" },
    },
    gameSystem: { enabled: true, name: "Sistema", points: 0, chestPool: [
      { name: "Katana de Ferreiro Mestre", desc: "Lâmina excelente, digna de um samurai.", kind: "arma" },
      { name: "Passos de Ninja", desc: "Move-se em silêncio total por uma cena.", kind: "habilidade" },
      { name: "Arcabuz Tanegashima", desc: "Arma de fogo da época, com pólvora para dez tiros.", kind: "arma" },
      { name: "Armadura de Samurai Leve", desc: "Placas laqueadas que resistem a flechas.", kind: "equipamento" },
      { name: "Mente de Estrategista", desc: "Uma vez por dia, enxerga o ponto fraco de uma formação inimiga.", kind: "habilidade" },
      { name: "Pílula de Monge", desc: "Restaura as forças depois de um combate, uma vez.", kind: "item" },
    ], shop: [
      { id: "lingua", name: "Japonês Arcaico", desc: "Entende e fala o japonês da época sem sotaque estranho.", cost: 25, once: true },
      { id: "mapa", name: "Mapa Tático", desc: "Por uma cena, você vê a posição de tropas próximas como num jogo de estratégia.", cost: 30 },
      { id: "tecnica", name: "Técnica de Lança Básica", desc: "O corpo aprende a lutar com a yari como um soldado treinado.", cost: 40, once: true },
      { id: "remedio", name: "Kit Médico Moderno", desc: "Antisséptico, bandagens e analgésicos disfarçados de ervas.", cost: 25 },
      { id: "intencao", name: "Olhar de Hostilidade", desc: "Por uma cena, você sabe quem quer ferir você.", cost: 20 },
    ] },
    specialAbility: power("Tela do Sistema", "Uma interface que só você vê: mostra missões, pontos, status e uma loja de vantagens.", "O Sistema não prevê o futuro nem mata por você. Itens custam pontos ganhos com feitos reais. Ninguém mais vê a tela."),
    gameStyle: "acao",
  }),
  base({
    id: "isekai-caribe",
    world: "Caribe, julho de 1715",
    worldBg: ORIGINAL_NOTE("Caribe na Era de Ouro da Pirataria, julho de 1715. A Frota do Tesouro espanhola se prepara para zarpar de Havana carregada de ouro e prata. Piratas, corsários, mercadores, escravizados fugidos e governadores corruptos. História real como pano de fundo: a frota de 1715 naufragou num furacão em 31 de julho; o jogador pode mudar o que acontece."),
    isKnownIP: false,
    charName: "Diego Ramos (no corpo de Tomás, grumete)",
    charTitle: "Grumete a bordo do Andorinha, navio pirata",
    charAge: "19",
    genre: "Isekai histórico com Sistema",
    hook: "Você acordou como grumete num navio pirata. O capitão quer atacar a Frota do Tesouro espanhola. Você sabe que um furacão vai afundá-la em poucos dias.",
    charBg: "Diego, 28 anos, oceanógrafo de Florianópolis, adormeceu num barco de pesquisa. Acordou como Tomás, grumete mestiço a bordo do Andorinha, um sloop pirata. Ele sabe que a Frota do Tesouro de 1715 vai naufragar num furacão na costa da Flórida — com o ouro indo para o fundo do mar.",
    charPersonality: "Curioso, calmo no mar, inquieto em terra. Fala de correntes e pressão atmosférica como quem reza. Quando mente, olha para o céu. Medo: morrer afogado — de novo.",
    charSkills: "Oceanografia e meteorologia (prever tempestades), natação, mergulho, navegação moderna sem instrumentos. O corpo de Tomás sabe subir no cordame e dar nós.",
    supportingCast: "Capitã Ana Bonfim — capitã do Andorinha; cicatriz no queixo, ri alto, generosa com a tripulação e implacável com traidores; tique: gira uma moeda de ouro entre os dedos. Mestre Jonas — velho contramestre; desconfia de tudo que é novo, conhece o mar como ninguém. Rodrigo Salgado — imediato; bonito e ambicioso, quer o navio para si.",
    storyStartPoint: `Sal na boca e o chão balançando. Você está pendurado no cordame de um navio, a vinte pés do convés, com o mar verde-turquesa embaixo. Uma tela azul se abre na frente dos olhos: 【Sistema】 Usuário vinculado. Local: Caribe, 24 de julho de 1715. Missão inicial: sobreviver à temporada de furacões. Lá embaixo, a capitã aponta para o horizonte com a moeda de ouro na mão: "Tomás! Desce daí. Você tem olhos bons — quero saber se aquelas velas são da frota espanhola." Rodrigo, ao lado dela, sem tirar os olhos de você: "O garoto caiu na água ontem e voltou falando sozinho. Dá azar levar louco para o ataque, capitã."`,
    narration: { style: "cinematic", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Magro, pele morena queimada de sol, cabelo crespo preso com fita vermelha, descalço, camisa rasgada.",
    relationships: { "Capitã Ana Bonfim": "Amigável", "Mestre Jonas": "Neutral", "Rodrigo Salgado": "Suspeito" },
    worldState: { location: "Convés do sloop Andorinha, perto de Havana", npcs: {
      "Capitã Ana Bonfim": "capitã pirata; cicatriz no queixo, gira moeda de ouro; Andorinha; generosa e implacável",
      "Mestre Jonas": "contramestre; velho e desconfiado; Andorinha; conhece o mar",
      "Rodrigo Salgado": "imediato; bonito e ambicioso; Andorinha; quer o navio",
    } },
    plots: [
      plot("A Frota do Tesouro", "O capitão quer atacar os galeões espanhóis. Você sabe que um furacão vai afundá-los — e quem estiver por perto."),
      plot("O motim", "Rodrigo quer o navio e está juntando aliados. Um grumete 'louco' é o bode expiatório perfeito."),
      plot("O ouro no fundo do mar", "Você sabe onde a frota vai naufragar. Quem chegar primeiro ao local fica rico — se sobreviver."),
    ],
    gmBrief: {
      truth: "Rodrigo vendeu a posição do Andorinha a um caçador de piratas inglês em troca de perdão e do comando do navio depois. Ana Bonfim é filha de um capitão espanhol da própria Frota do Tesouro e quer atacar não pelo ouro, mas para resgatar o pai, preso a bordo por traição. O furacão real chega em 31 de julho.",
      clues: ["Rodrigo troca mensagens com um barco de pesca que sempre aparece ao amanhecer.", "Ana guarda um retrato de um oficial espanhol com o mesmo queixo que ela.", "O barômetro natural (nuvens altas e ondas longas) mostra o furacão chegando em poucos dias.", "Um marinheiro bêbado fala de 'perdão do rei' para quem entregar piratas."],
      escalation: ["Rodrigo começa a espalhar que Tomás é um bruxo que traz azar.", "Um navio caçador de piratas inglês aparece no horizonte.", "O furacão chega em 31 de julho e a frota afunda — com ou sem o Andorinha por perto."],
      twist: "Ana não quer o ouro: quer o pai, preso num dos galeões. Se Tomás avisar do furacão, ela vai atacar mais cedo — e mais perigosamente.",
      agendas: { "Capitã Ana Bonfim": "resgatar o pai da frota espanhola", "Mestre Jonas": "proteger a tripulação; confia no mar, não em pessoas", "Rodrigo Salgado": "tomar o navio e conseguir o perdão inglês" },
    },
    gameSystem: { enabled: true, name: "Sistema", points: 0, chestPool: [
      { name: "Par de Pistolas de Pederneira", desc: "Duas pistolas carregadas, prontas para a abordagem.", kind: "arma" },
      { name: "Sabre de Abordagem", desc: "Lâmina curva perfeita para lutar no convés.", kind: "arma" },
      { name: "Luneta de Almirante", desc: "Enxerga velas e bandeiras a milhas de distância.", kind: "equipamento" },
      { name: "Sorte do Mar", desc: "Uma vez por semana, uma bala ou onda erra você por pouco.", kind: "habilidade" },
      { name: "Mapa do Tesouro Verdadeiro", desc: "Um mapa real de um esconderijo pirata da região.", kind: "item" },
      { name: "Equilíbrio de Gaivota", desc: "Nunca escorrega ou cai do cordame, nem na tempestade.", kind: "habilidade" },
    ], shop: [
      { id: "previsao", name: "Leitura do Céu", desc: "Prevê o tempo com precisão para as próximas 48 horas.", cost: 20 },
      { id: "folego", name: "Fôlego Profundo", desc: "Prende a respiração por até cinco minutos debaixo d'água.", cost: 35, once: true },
      { id: "espada", name: "Esgrima de Convés", desc: "O corpo aprende a lutar com sabre como um pirata veterano.", cost: 40, once: true },
      { id: "remedio", name: "Kit Médico Moderno", desc: "Antisséptico, bandagens e vitamina C contra escorbuto.", cost: 25 },
      { id: "mapa", name: "Carta Náutica", desc: "Uma carta precisa de recifes, correntes e enseadas da região.", cost: 30 },
    ] },
    specialAbility: power("Tela do Sistema", "Uma interface que só você vê: mostra missões, pontos, status e uma loja de vantagens.", "O Sistema não controla o mar nem impede o furacão. Itens custam pontos ganhos com feitos reais. Ninguém mais vê a tela."),
  }),
  base({
    id: "isekai-paris-1793",
    world: "Paris, outubro de 1793",
    worldBg: ORIGINAL_NOTE("Paris no auge do Terror da Revolução Francesa, outubro de 1793. O Comitê de Salvação Pública governa por decretos; a guilhotina trabalha todo dia na Praça da Revolução; denúncias anônimas mandam vizinhos para a morte. Sans-culottes, jacobinos, girondinos escondidos, aristocratas disfarçados. História real como pano de fundo: figuras históricas existem e seguem seus caminhos, mas a história pode divergir pelas escolhas do jogador."),
    isKnownIP: false,
    charName: "André Lima (no corpo de Jean Moreau, escrivão)",
    charTitle: "Escrivão do Tribunal Revolucionário",
    charAge: "27",
    genre: "Isekai histórico com Sistema",
    hook: "Você acordou como escrivão do Tribunal Revolucionário, em pleno Terror. Amanhã, você vai registrar a sentença de alguém que você conhece dos livros de história.",
    charBg: "André, 35 anos, advogado criminalista de Porto Alegre, dormiu lendo um processo. Acordou como Jean Moreau, escrivão que anota os julgamentos do Tribunal Revolucionário. Jean tem uma noiva, Claire, de família suspeita de ser realista. Uma denúncia anônima contra ela está na mesa dele.",
    charPersonality: "Argumentador, idealista, irônico com fanáticos. Odeia injustiça processual. Quando mente, ajeita a gravata. Medo: virar cúmplice de assassinatos legais para salvar a própria pele.",
    charSkills: "Direito, retórica, leitura de pessoas em interrogatório, francês básico (o Sistema ajuda). O corpo de Jean escreve rápido e conhece os corredores do Palácio da Justiça.",
    supportingCast: "Cidadão Fouquet — promotor; voz mansa, olhos de pedra, coleciona sentenças como troféus; tique: limpa os óculos antes de acusar. Claire Dumont — noiva de Jean; costureira, corajosa, esconde um padre fugitivo no porão. Pierre 'Bonnet Rouge' — sans-culotte do bairro; barulhento, sincero, acha que Jean é um herói da Revolução.",
    storyStartPoint: `Cheiro de tinta, suor e madeira velha. Você está sentado numa mesa alta, com uma pena na mão, diante de uma sala cheia de gente gritando. Uma tela azul se abre no ar: 【Sistema】 Usuário vinculado. Local: Paris, 14 de outubro de 1793. Missão inicial: sobreviver ao Terror. Na sua frente, uma lista de nomes para o julgamento de amanhã. O terceiro é Claire Dumont. O promotor Fouquet, limpando os óculos: "Cidadão Moreau. Anote com letra bonita. Amanhã a República terá um dia cheio." Pierre, do fundo da sala, erguendo o barrete vermelho: "Viva a República! Moreau, depois a gente bebe!"`,
    narration: { style: "literary", length: "balanced", pace: "balanced" },
    charAppearanceNote: "Alto e pálido, cabelo castanho preso em rabo, casaca escura gasta, tinta nos dedos, cocar tricolor no peito.",
    relationships: { "Cidadão Fouquet": "Suspeito", "Claire Dumont": "Amigável", "Pierre": "Amigável" },
    worldState: { location: "Sala do Tribunal Revolucionário, Palácio da Justiça", npcs: {
      "Cidadão Fouquet": "promotor; voz mansa, olhos de pedra, limpa os óculos; tribunal; coleciona sentenças",
      "Claire Dumont": "noiva de Jean; costureira corajosa; ateliê no Marais; esconde um padre fugitivo",
      "Pierre": "sans-culotte; barulhento e sincero; bairro e tribunal; admira Jean",
    } },
    plots: [
      plot("A lista de amanhã", "Claire está na lista do Tribunal. Você tem um dia para tirá-la de lá sem se tornar o próximo."),
      plot("Quem denunciou Claire", "A denúncia anônima foi escrita por alguém próximo. Descobrir quem pode salvar ou destruir tudo."),
      plot("O Terror e a história", "Você sabe que o Terror cai em julho de 1794. Até lá, cada dia custa cabeças."),
    ],
    gmBrief: {
      truth: "A denúncia contra Claire foi escrita pelo próprio Fouquet, que quer o ateliê dela para um parente e usa o padre escondido como prova. Mas Fouquet também tem um segredo: é ex-padre e renegou os votos para sobreviver; se isso vier à tona, ele cai. Pierre conhece o padre escondido e vai entregar Claire sem querer, achando que está ajudando a Revolução.",
      clues: ["A letra da denúncia tem o mesmo jeito de fazer o 'f' das anotações de Fouquet.", "Fouquet reza baixinho em latim quando acha que está sozinho.", "Pierre comenta que viu 'um homem de batina' entrando no ateliê de Claire.", "Um registro paroquial antigo lista um 'irmão Fouquet' num mosteiro de Lyon."],
      escalation: ["Pierre leva guardas ao ateliê de Claire achando que vai 'proteger' a Revolução.", "Fouquet pede que Jean testemunhe contra Claire para provar lealdade.", "O julgamento acontece: o veredito sai em minutos, e a carroça para a guilhotina parte ao meio-dia."],
      twist: "O padre escondido no porão de Claire é o irmão mais velho de Fouquet. Fouquet quer o irmão morto para apagar o próprio passado.",
      agendas: { "Cidadão Fouquet": "apagar o passado de padre e ganhar poder", "Claire Dumont": "proteger o padre e manter a dignidade", "Pierre": "servir à Revolução; é leal a Jean, mas ingênuo" },
    },
    gameSystem: { enabled: true, name: "Sistema", points: 0, chestPool: [
      { name: "Bengala-Espada", desc: "Uma bengala elegante que esconde uma lâmina fina.", kind: "arma" },
      { name: "Rosto Esquecível", desc: "Por uma cena, ninguém lembra do seu rosto depois.", kind: "habilidade" },
      { name: "Pistola de Duelo", desc: "Uma pistola precisa, com um único tiro carregado.", kind: "arma" },
      { name: "Cocar de Jacobino Respeitado", desc: "Faz os guardas confiarem em você à primeira vista.", kind: "equipamento" },
      { name: "Memória de Arquivista", desc: "Lembra cada documento que leu nos últimos dias.", kind: "habilidade" },
      { name: "Chave Mestra da Conciergerie", desc: "Abre uma porta da prisão, uma única vez.", kind: "item" },
    ], shop: [
      { id: "lingua", name: "Francês Perfeito", desc: "Fala o francês da época como um parisiense.", cost: 25, once: true },
      { id: "documento", name: "Salvo-Conduto", desc: "Um passaporte revolucionário falso e convincente para uma pessoa.", cost: 40 },
      { id: "verdade", name: "Detector de Mentira", desc: "Por uma conversa, você percebe quando alguém mente.", cost: 25 },
      { id: "arquivo", name: "Arquivo Secreto", desc: "Um documento comprometedor real sobre alguém do Tribunal.", cost: 35 },
      { id: "moedas", name: "Bolsa de Assignats", desc: "Dinheiro da época para subornos.", cost: 20 },
    ] },
    specialAbility: power("Tela do Sistema", "Uma interface que só você vê: mostra missões, pontos, status e uma loja de vantagens.", "O Sistema não salva ninguém sozinho. Itens custam pontos ganhos com feitos reais. Ninguém mais vê a tela."),
  }),
];

// Tom de cada história, usado nos filtros da biblioteca.
export const PRESET_TONES = ["Mistério", "Terror", "Aventura", "Ação", "Intriga", "Leve"];
const TONE_BY_ID = {
  naruto: "Mistério", "one-piece": "Aventura", "harry-potter": "Mistério", "star-wars": "Aventura",
  witcher: "Terror", skyrim: "Terror", pokemon: "Leve", westeros: "Intriga", bleach: "Terror",
  jujutsu: "Terror", "attack-on-titan": "Ação", lotr: "Aventura", avatar: "Intriga", "demon-slayer": "Ação",
  "ordem-paranormal": "Terror", "sertao-arcano": "Aventura", "recife-2099": "Ação",
  "farol-ilha-negra": "Terror", "academia-lumen": "Mistério",
  "got-rebeliao-norte": "Intriga", "got-antes-da-conquista": "Intriga",
  "isekai-roma": "Intriga", "isekai-sengoku": "Ação", "isekai-caribe": "Aventura", "isekai-paris-1793": "Intriga",
};
for (const preset of ADVENTURE_PRESETS) preset.tone = TONE_BY_ID[preset.id] || "Aventura";

/** Filtra histórias por texto, tom e origem ("todos" | "conhecido" | "original"). */
export function filterPresets(list, { query = "", tone = "", origin = "todos" } = {}) {
  const q = String(query).trim().toLowerCase();
  return list.filter((p) => {
    if (tone && p.tone !== tone) return false;
    if (origin === "conhecido" && !p.isKnownIP) return false;
    if (origin === "original" && p.isKnownIP) return false;
    if (!q) return true;
    return [p.world, p.charName, p.charTitle, p.hook, p.genre].some((v) => String(v || "").toLowerCase().includes(q));
  });
}
