//
// MIT License
//
// Copyright (c) 2020 Carlos Rafael Gimenes das Neves
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// https://github.com/carlosrafaelgn/pixel
//

"use strict";

class Strings {
	public static DecimalSeparator = ".";
	public static OppositeDecimalSeparator = ",";
	public static YouWillLoseYourLevel = "You will lose your level! Continue?";
	public static TooManyObjects = "There are too many objects in the level ";
	public static TooManyBalls = "There are too many balls in the level ";
	public static TooManyPolygons = "There are too many polygons in the level! Please, try to keep the polygon count below ";
	public static TooManyPoints = "There are too many points in the level! Please, try to keep the points count below ";
	public static InvalidImage = "Invalid image! Please, select a PNG or a JPG image ";
	public static EmptyImage = "The image was empty ";
	public static ErrorLoadingImage = "Sorry! Something went wrong while loading the image ";
	public static ErrorReadingImage = "Sorry! Something went wrong while reading the image ";
	public static ClearEntireLevel = "Clear the entire level?";
	public static SaveLevel = "Save Level";
	public static NameCannotContain = "Sorry! The name cannot contain the characters";
	public static SomethingWentWrong = "Sorry! Something went wrong ";
	public static Success = "Success!";
	public static LevelSaved = "Level saved! ";
	public static Pause = "Pause";
	public static Fullscreen = "Fullscreen";
	public static ControlMode = "Control Mode";
	public static Restart = "Restart";
	public static InvalidLevel = "Invalid level! Please, select a JSON file ";
	public static EmptyLevel = "The level was empty ";
	public static ErrorLoadingLevel = "Sorry! Something went wrong while loading the level ";
	public static LevelImported = "Level imported! ";
	public static ErrorReadingLevel = "Sorry! Something went wrong while reading the level ";
	public static Menu = "Menu";
	public static Edit = "Edit";
	public static Delete = "Delete";
	public static DeleteLevel = "Delete the level ";
	public static OK = "OK";
	public static Cancel = "Cancel";
	public static Clear = "Clear";
	public static Close = "Close";
	public static Exit = "Exit";
	public static Play = "Play";
	public static Install = "Install!";
	public static Oops = "Oops\u2026";
	public static Download = "Download";
	public static LevelSpace = "Level ";
	public static Level = "Level";
	public static LevelName = "Level Name";
	public static About = "About";
	public static About1 = "<p>My son is still into maze games nowadays (September 2020). So... As I needed to put WebAssembly";
	public static About2 = " and WebGL2";
	public static About3 = " into practice";
	public static About4 = ", even though WebAssembly is not currently supported by your browser";
	public static About5 = ", I decided to continue the game I created for him in 2019! Cucumbers must be collected in some levels because he enjoys a certain cucumber from a famous cartoon! By the way, he created Level 1 on his own ";
	public static About6 = '<p>You can also <a href="https://play.google.com/store/apps/details?id=br.com.carlosrafaelgn.pixel" target="_blank">install an Android wrapper</a> (just to keep the screen on even without touching it).</p>';
	public static About7 = '<p>The source code for this game can be found at <a href="https://github.com/carlosrafaelgn/pixel" target="_blank">GitHub</a> and is licensed under the <a href="https://github.com/carlosrafaelgn/pixel/blob/master/LICENSE" target="_blank">MIT License</a>. The game uses the physics engine <a href="https://github.com/slembcke/Chipmunk2D" target="_blank">Chipmunk2D</a>, licensed under the <a href="https://github.com/slembcke/Chipmunk2D/blob/master/LICENSE.txt" target="_blank">MIT License</a>, and also uses the font <a href="https://github.com/google/fonts/tree/master/ofl/pressstart2p" target="_blank">Press Start 2P</a>, licensed under the <a href="https://github.com/google/fonts/blob/master/ofl/pressstart2p/OFL.txt" target="_blank">SIL Open Font License</a>.</p>';
	public static LevelDeleted = "Level deleted! ";
	public static LevelDownloaded = "Level downloaded! ";
	public static TryToDownloadAgain = "Please, try to download the level again, after granting the requested permission.";
	public static DownloadFailedFileExists = "Sorry! The level could not be downloaded because there is another file with the same name in the Download folder ";
	public static LevelImageDownloaded = "Image downloaded! ";
	public static TryToDownloadLevelImageAgain = "Please, try to download the image again, after granting the requested permission.";
	public static LevelImageDownloadFailedFileExists = "Sorry! The image could not be downloaded because there is another file with the same name in the Download folder ";
	public static NewRecord = "New Record!";
	public static Time = "Time";
	public static Name = "Name";

	public static init(): void {
		const language = (androidWrapper ? androidWrapper.getBrowserLanguage() : (navigator["userLanguage"] as string || navigator.language));
		if (language && language.toLowerCase().indexOf("pt") === 0) {
			document.documentElement.setAttribute("lang", "pt-br");

			Strings.DecimalSeparator = ",";
			Strings.OppositeDecimalSeparator = ".";
			Strings.YouWillLoseYourLevel = "Você vai perder sua fase! Continuar?";
			Strings.TooManyObjects = "Há muitos objetos na fase ";
			Strings.TooManyBalls = "Há muitas bolas na fase ";
			Strings.TooManyPolygons = "Há muitos polígonos na fase! Por favor, tente deixar a contagem de polígonos abaixo de ";
			Strings.TooManyPoints = "Há muitos pontos na fase! Por favor, tente deixar a contagem de pontos abaixo de ";
			Strings.InvalidImage = "Imagem inválida! Por favor, escolha uma imagem PNG ou JPG ";
			Strings.EmptyImage = "A imagem estava vazia ";
			Strings.ErrorLoadingImage = "Desculpe! Algo deu errado ao carregar a imagem ";
			Strings.ErrorReadingImage = "Desculpe! Algo deu errado ao ler a imagem ";
			Strings.ClearEntireLevel = "Limpar a fase toda?";
			Strings.SaveLevel = "Salvar Fase";
			Strings.NameCannotContain = "Desculpe! O nome não pode conter os caracteres";
			Strings.SomethingWentWrong = "Desculpe! Algo deu errado ";
			Strings.Success = "Sucesso!";
			Strings.LevelSaved = "Fase salva! ";
			Strings.Pause = "Pausa";
			Strings.Fullscreen = "Tela Cheia";
			Strings.ControlMode = "Modo de Controle";
			Strings.Restart = "Reiniciar";
			Strings.InvalidLevel = "Fase inválida! Por favor, escolha um arquivo JSON ";
			Strings.EmptyLevel = "A fase estava vazia ";
			Strings.ErrorLoadingLevel = "Desculpe! Algo deu errado ao carregar a fase ";
			Strings.LevelImported = "Fase importada! ";
			Strings.ErrorReadingLevel = "Desculpe! Algo deu errado ao ler a fase ";
			//Strings.Menu = "Menu";
			Strings.Edit = "Editar";
			Strings.Delete = "Excluir";
			Strings.DeleteLevel = "Excluir a fase ";
			//Strings.OK = "OK";
			Strings.Cancel = "Cancelar";
			Strings.Clear = "Limpar";
			Strings.Close = "Fechar";
			Strings.Exit = "Sair";
			Strings.Play = "Jogar";
			Strings.Install = "Instalar!";
			//Strings.Oops = "Oops\u2026";
			//Strings.Download = "Download";
			Strings.LevelSpace = "Fase ";
			Strings.Level = "Fase";
			Strings.LevelName = "Nome da Fase";
			Strings.About = "Sobre";
			Strings.About1 = "<p>Meu filho ainda gosta de jogos de labirinto hoje em dia (Setembro de 2020). Então... Como eu precisava colocar WebAssembly";
			Strings.About2 = " e WebGL2";
			Strings.About3 = " em prática";
			Strings.About4 = ", apesar de WebAssembly não ser suportado por seu navegador";
			Strings.About5 = ", decidi coninuar o jogo que eu criei para ele em 2019! Pepinos devem ser coletados em alguns níveis porque ele adora um certo pepino de um desenho famoso! A propósito, ele criou a Fase 1 sozinho ";
			Strings.About6 = '<p>Você também pode <a href="https://play.google.com/store/apps/details?id=br.com.carlosrafaelgn.pixel" target="_blank">instalar uma versão para Android</a> (apenas para manter a tela ligada mesmo sem que ela seja tocada).</p>';
			Strings.About7 = '<p>O código-fonte do jogo pode ser encontrado no <a href="https://github.com/carlosrafaelgn/pixel" target="_blank">GitHub</a> e é licenciado sob a <a href="https://github.com/carlosrafaelgn/pixel/blob/master/LICENSE" target="_blank">MIT License</a>. O jogo usa o motor de física <a href="https://github.com/slembcke/Chipmunk2D" target="_blank">Chipmunk2D</a>, licenciado sob a <a href="https://github.com/slembcke/Chipmunk2D/blob/master/LICENSE.txt" target="_blank">MIT License</a>, e também usa a fonte <a href="https://github.com/google/fonts/tree/master/ofl/pressstart2p" target="_blank">Press Start 2P</a>, licenciada sob a <a href="https://github.com/google/fonts/blob/master/ofl/pressstart2p/OFL.txt" target="_blank">SIL Open Font License</a>.</p>';
			Strings.LevelDeleted = "Fase excluída! ";
			Strings.LevelDownloaded = "Download da fase concluído! ";
			Strings.TryToDownloadAgain = "Por favor, tente realizar o download da fase novamente, depois de conceder permissão.";
			Strings.DownloadFailedFileExists = "Desculpe! Não foi possível realizar o download da fase porque já existe um arquivo com o mesmo nome na pasta Download ";
			Strings.LevelImageDownloaded = "Download da imagem concluído! ";
			Strings.TryToDownloadLevelImageAgain = "Por favor, tente realizar o download da imagem novamente, depois de conceder permissão.";
			Strings.LevelImageDownloadFailedFileExists = "Desculpe! Não foi possível realizar o download da imagem porque já existe um arquivo com o mesmo nome na pasta Download ";
			Strings.NewRecord = "Novo Recorde!";
			Strings.Time = "Tempo";
			Strings.Name = "Nome";
		}
	}
}
