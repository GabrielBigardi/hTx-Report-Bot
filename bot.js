var reportedFile = 'reported_users/ids_reported.txt';

const request = require('request');
const fs = require('fs');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const config = require('./config.json');

const client = new SteamUser();

const logOnOptions = {
	accountName : config.accountName,
	password : config.password,
	twoFactorCode : SteamTotp.generateAuthCode(config.shared_secret)
};

client.logOn(logOnOptions);

client.on('loggedOn', () => {
	console.log('BOT [ON]');
	client.setPersona(SteamUser.EPersonaState.Online);
	client.gamesPlayed('Private Report Bot [ON]');
});

client.on('friendMessage', function(steamID, message) {
	var steamUserID = steamID.getSteam3RenderedID();
	console.log("Friend message from " + steamUserID + ": " + message);
	
	if (message.substring(0, 1) == '!') {
		var args = message.substring(1).split(' ');
		var cmd = args[0];
		args = args.splice(1);
		
		switch(cmd){
			case 'ajuda':
			client.getPersonas([steamID], function(err, personas) {
				if(err){
					console.log(err);
				}else{
					var persona = personas[steamID];
					var name = persona ? persona.player_name : ("[" + steamID + "]");
					replyMessage = "Olá " + name + ", sou um report bot.\nO que faço é mandar vários reports para o usuário, até que ele esteja banido.\nPara mais informações de como utilizar meus serviços digite !info";
					//console.log("Bot disse para: " + name + ": " + replyMessage);
					client.chat.sendFriendMessage(steamID, replyMessage);
				}
			});
			break;
			
			
			case 'info':
			client.getPersonas([steamID], function(err, personas) {
				if(err){
					console.log(err);
				}else{
					var persona = personas[steamID];
					var name = persona ? persona.player_name : ("[" + steamID + "]");
					replyMessage = "Para reportar um usuário, basta digitar !report seguido pelo SteamID64.\nExemplo: !report 76561198842691230\n\nPara pegar um SteamID64 basta digitar !steamid LINKDOUSUÁRIO.\nExemplo: !steamid https://steamcommunity.com/id/gabenewell";
					//console.log("Bot disse para: " + name + ": " + replyMessage);
					client.chat.sendFriendMessage(steamID, replyMessage);
				}
			});
			break;
			
			
			case 'reportar':
			if(args.length >= 1){
				if(args[0].length == 17){
					console.log("Report ID: " + args[0] + " validado com sucesso.");
					replyMessage = "Reportando usuário ID: " + args[0] + ", por favor aguarde...";
					client.chat.sendFriendMessage(steamID, replyMessage);
					
					request('http://localhost/api.php?steamid64=' + args[0] + '', { json: false }, (err, res, body) => {
					if (err) {
						return console.log(err);
					}
						//console.log(body);
						if(body == "Success"){
							
							fs.readFile(reportedFile, function (err, data) {
								if (err) throw err;
								if(data.indexOf(args[0]) >= 0){
									console.log("Dados já existentes")
									client.chat.sendFriendMessage(steamID, "Usuário ID: " + args[0] + " já foi reportado.\nApenas aguarde pelo seu banimento.");
								}else{
									//=======  Lê e escreve o novo saldo do usuário  ========
									var balancePath = 'users_balance/'+steamID+'.txt';
									var userBalance = 0;
									
									
									// se é a primeira vez cria txt com saldo 0
									fs.open(balancePath,'r',function(err, fd){
										if (err) {
											fs.writeFile(balancePath, '0', function(err) {
												if(err) {
													console.log(err);
												}
											});
										}
									});
									
									
									// le o saldo do usuário
									fs.readFile(balancePath, function (err, data) {
										if (err){
											console.log(err);
										}else{
											userBalance = data;
											
											//checa se o usuário tem saldo suficiente
											if(userBalance <= 0){
												console.log("Saldo de " + steamID + " insuficiente. Saldo: " + userBalance);
												client.chat.sendFriendMessage(steamID,"Seu saldo é insuficiente.\nPara saber como efetuar uma recarga de saldo digite !recarga");
											}else{
												console.log("Inserindo novo usuário ID: "+args[0]+"na lista de já reportados");
												// remove 1 do saldo
												fs.writeFile(balancePath, userBalance - 1, function(err) {
													if(err) {
														return console.log(err);
													}
												});
												
												//=======  Escreve ID do usuário nos já reportados  =======
												fs.appendFile(reportedFile, args[0]+"\r\n", function(err) {
													if(err) {
														return console.log(err);
													}
												});
												
												//envia mensagem
												client.chat.sendFriendMessage(steamID, "11 reports enviados para: " + args[0] + ".\n1 crédito foi removido de seu saldo.\nSeu novo saldo é: " + userBalance + " créditos.");
												
											}
										}
									});
								
									
									
									

								}
							});
							
							
							
							
						}else{
							console.log(body);
							client.chat.sendFriendMessage(steamID, "Usuário inexistente, verifique o SteamID64 e tente novamente.");
						}
					});
					
					
					
				}else{
					console.log("ID Incorreto: " + args[0] + " - Tamanho: " + args[0].length);
					replyMessage = "Falha ao reportar: " + args[0] + " - Verifique o SteamID.";
					client.chat.sendFriendMessage(steamID, replyMessage);
				}
			}else{
				replyMessage = "Faltam argumentos, modo de uso: !report 76561198969255321";
				client.chat.sendFriendMessage(steamID, replyMessage);
			}
			break;
		}
	}
});

client.on('friendRelationship', function(steamID, relationship) {
    if (relationship == SteamUser.EFriendRelationship.RequestRecipient) {
        client.addFriend(steamID);
		console.log("New friend request accepted: " + steamID);
    }
});