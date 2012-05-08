/***************************************************************************************************************
 *  File : duel.js
 * 
 *  Gère la classe Duel
 */




/***************************************************************************************************************
 *  Class : Duel
 * 
 *  Cet classe gère les duels via Jabber
 */
function Duel () {
  /***************************************************************************************************************
   *  String : did
   *
   *  Duel ID créée par le challenger de la forme : yyyymmdd-hhmmss-jid_challenger-jid_champion
   */
  this.did = null;
  this.resolution = null;
  this.dimensions = null;
  this.template = null;
  /***************************************************************************************************************
   *  Array : players
   *
   *  (JID String) - Tableau de joueurs et d'invités (contenant leur role dans le duel)
   * 
   *  Exemple : players["challenger@jabber.com"] = "challenger";
   * 
   *  Role dans le duel :
   *    challenger > Je propose le duel
   *    champion > J'accepte le duel
   *    guest_challenger > Je suis un spectateur et voit l'écran du challenger
   *    guest_champion > Je suis un spectateur et voit l'écran du champion
   *    guest > Je suis un spectateur et ne voit que le terrain de jeu
   */
  this.players = [];
  /***************************************************************************************************************
   *  Object : ycd
   *
   *  Objet YCD, permettant d'accéder à toutes les informations sur Yugioh
   */
  this.ycd = {};
  /***************************************************************************************************************
   *  Object : deck
   *
   *  (deck Object) - Mon deck pour le duel
   */
  this.deck = {};
  /***************************************************************************************************************
   *  Array : cards
   *
   *  (card Object) - Tableau de toutes les cartes du duel (les miennes, et celles de mon adversaire) au format gamecard
   */
  this.cards = [];
  /***************************************************************************************************************
   *  Array : gamecards
   *
   *  (cards Array) - Tableau de tableaux de cartes (contenant leur card_index) : gamecards["main_me/hand_op"][i] = card_index
   */
  this.gamecards = [];
  /***************************************************************************************************************
   *  Function : init
   *
   *  Initialise le duel (crée un Duel ID, ajoute les joueurs,...)
   * 
   *  Parameters :
   *    (DID String) did - Duel ID si le Duel existe déjà (créé par le challenger)
   *    (JID String) jid_challenger - JID du challenger (qui demande le duel)
   *    (JID String) jid_champion - JID du champion (qui est sollicité pour le duel)
   */
  this.init = function (did,challenger,champion) {
    // Récupération de la date
    var date =  new Date();
    var date_year = date.getFullYear();
    var date_month = parseInt(date.getMonth())+1;
    if (date_month < 10) { date_month = "0" + date_month; }
    var date_day = date.getDate();
    if (date_day < 10) { date_day = "0" + date_day; }
    var date_hour = date.getHours();
    if (date_hour < 10) { date_hour = "0" + date_hour; }
    var date_minute = date.getMinutes();
    if (date_minute < 10) { date_minute = "0" + date_minute; }
    var date_second = date.getSeconds();
    if (date_second < 10) { date_second = "0" + date_second; }
    // Génération du Duel ID
    this.did = date_year + date_month + date_day + "-" + date_hour + date_minute + date_second + "-" + challenger + "-" + champion;
    // Ajout des joueurs au duel
    this.players = [];
    this.players[jid_challenger] = "challenger";
    this.players[jid_champion] = "champion";
  };
  /***************************************************************************************************************
   *  Function : loadYCD
   *
   *  Charge YCD en mémoire
   */
  this.loadYCD = function () {
    this.ycd = new Ycd (Addons.ycd_file);
  };
  /***************************************************************************************************************
   *  Function : loadDimensions
   *
   *  Charge les dimensions d'un "duel" des préférences en mémoire
   */
  this.loadDimensions = function () {
    this.resolution = Prefs.getChar("resolution.duel");
    this.dimensions = Dimension[this.resolution];
  };
  /***************************************************************************************************************
   *  Function : loadTemplate
   *
   *  Charge le nom du template des préférences en mémoire
   */
  this.loadTemplate = function () {
    // Par défaut, on cherche si le template des préférences appartient à l'utilisateur, sinon c'est de yLife
    var user_template = getFolder("ProfD");
    user_template.append("data");
    user_template.append("templates");
    user_template.append("duel");
    user_template.append(Prefs.getChar("template.duel"));
    this.template = (user_template.exists()) ? "file://" + user_template.path : "chrome://ylifecore/skin/templates/duel/" + Prefs.getChar("template.duel") ;
  };
  /***************************************************************************************************************
   *  Function : addMessage
   *
   *  Ajoute un message à la conversation (entrant ou sortant)
   * 
   *  Parameters :
   *    (String) message - Texte à afficher
   *    (String) direction - in/out
   */
  this.addMessage = function (msg,direction) {
    // Récupération de la date
    var date =  new Date();
    var h = (date.getHours() < 10) ? "0" + date.getHours() : date.getHours();
    var m = (date.getMinutes() < 10) ? "0" + date.getMinutes() : date.getMinutes();
    var s = (date.getSeconds() < 10) ? "0" + date.getSeconds() : date.getSeconds();
    // Récupération du Nom : Celui de l'envoyeur : Mon correspondant ou moi
    var nickname = (direction == "in") ? Contacts.contacts[this.jid].nickname : Jabber.vcard.nickname;
    // Récupération du Message
    var message_node = $("duel_iframe_" + this.jid).contentWindow.document.getElementById("messagetoclone").cloneNode(true);
    message_node.removeAttribute("id"); 
    var serializer = new XMLSerializer();
    var message = serializer.serializeToString(message_node);
    message = message.replace("{direction}",direction);
    message = message.replace("{nickname}",nickname);
    message = message.replace("{message}",msg);
    message = message.replace("{h}",h);
    message = message.replace("{m}",m);
    message = message.replace("{s}",s);
    var parser = new DOMParser ();
    var message_dom = parser.parseFromString (message, "text/xml").documentElement;
    // Ajout du message
    $("duel_iframe_" + this.jid).contentWindow.document.getElementById("messages").appendChild(message_dom);
    $("duel_iframe_" + this.jid).contentWindow.location = this.template + "#bottom";
  };
  /***************************************************************************************************************
   *  Function : sendMessage
   *
   *  Envoie le message tapé au correspondant
   */
  this.sendMessage = function () {
    // On récupère le message dans le bon textbox
    var message = $("duel_message_out_" + jid).value;
    // On l'envoie
    var msg = $msg({to: this.jid, from: Jabber.account.jid, type: "duel"}).c("body").t(message);
    Jabber.send(msg.tree());
    this.addMessage(message,"out");
    $("duel_message_out_" + jid).value = "";
    $("duel_message_out_" + jid).focus();
  };
  /***************************************************************************************************************
   *  Function : onKeydown
   *
   *  Si appui sur le touche "Entrée", alors on envoie le message
   */
  this.onKeydown = function (event) {
    if (event.keyCode == event.DOM_VK_RETURN) {
      this.sendMessage();
      event.stopPropagation();
    }
  };
}

