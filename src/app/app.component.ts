import { Component } from '@angular/core';
import { words } from './words';

enum Colors {
  Grey,
  Yellow,
  Green
}

type Score = [
  Colors,
  Colors,
  Colors,
  Colors,
  Colors,
];

interface Guess {
  guess: string;
  score: Score;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  // This was chosen based on external analysis showing it minimized the size of
  // the remaining possible answers
  static readonly firstGuess = 'raise';

  public history: Guess[] = [];

  public hardMode = false;
  public won = false;
  public stumped = false;
  public thinking = false;
  public stop = false;
  public progress = 0;

  public colors = Colors;

  public currentGuess = AppComponent.firstGuess.toUpperCase();

  public colorBlocks: Score = [
    Colors.Grey,
    Colors.Grey,
    Colors.Grey,
    Colors.Grey,
    Colors.Grey,
  ];

  private possibleWords = [...words];

  public nextColor(i: number) {
    if (this.won || this.stumped || this.thinking) {
      return;
    }
    this.colorBlocks[i] += 1;
    if (this.colorBlocks[i] > 2) {
      this.colorBlocks[i] = 0;
    }
  }

  private static score(answer: string, guess: string): Score {
    const blocks: Score = [
      Colors.Grey,
      Colors.Grey,
      Colors.Grey,
      Colors.Grey,
      Colors.Grey,
    ];

    const answerList: Array<string | null> = answer.toLowerCase().split('');

    for (let i = 0; i < 5; i++) {
      if (answer[i].toLowerCase() === guess[i].toLowerCase()) {
        blocks[i] = Colors.Green;
        answerList[i] = null;
        continue;
      }

      for (let j = 0; j < 5; j++) {
        if (answerList[j] === guess[i].toLowerCase()) {

          blocks[i] = Colors.Yellow;
          answerList[j] = null;
          break;
        }
      }
    }

    return blocks;
  }

  public reset() {
    this.history = [];
    this.stumped = false;
    this.won = false;
    this.possibleWords = [...words];
    this.currentGuess = AppComponent.firstGuess.toUpperCase();
    this.resetColorBlocks();
  }

  public resetColorBlocks(color: Colors = Colors.Grey) {
    this.colorBlocks = [
      color,
      color,
      color,
      color,
      color,
    ];
  }

  private static compareScores(scoreA: Score, scoreB: Score): boolean {
    let match = true;
    for (let i = 0; i < 5; i++) {
      if (scoreA[i] !== scoreB[i]) {
        match = false;
        break;
      }
    }

    return match
  }

  private static filterWords(wordList: string[], guess: string, score: Score) {
    const newList: string[] = [];
    for (let word of wordList) {
      const wordScore = AppComponent.score(word, guess);

      if (AppComponent.compareScores(score, wordScore)) {
        newList.push(word);
      }
    }

    return newList;
  }

  public async computeRms(guess: string): Promise<number> {
    let rms = 0;

    for (let answer of this.possibleWords) {
      const score = AppComponent.score(answer, guess);
      const list = AppComponent.filterWords(this.possibleWords, guess, score);
      rms += list.length * list.length;
    }

    rms = Math.sqrt(rms / this.possibleWords.length);

    return rms;
  }

  public async makeGuess() {
    this.thinking=true;
    this.progress = 0;

    let bestGuess = null;
    let bestGuessRms = null;

    let count = 0;


    let possibleGuesses = words;

    if (this.hardMode) {
      possibleGuesses = this.possibleWords;
    }

    for (let guess of possibleGuesses) {
      if (this.stop) {
        return;
      }
      count++;

      // Add a delay so we don't kill the event loop and freeze the whole page
      if (count % 20 === 0) {
        this.progress = Math.floor(100 * count/words.length);
        await new Promise(res => setTimeout(res, 1));
      }

      const rms = await this.computeRms(guess);

      if (bestGuessRms === null || rms < bestGuessRms) {
        bestGuess = guess;
        bestGuessRms = rms;
      }
    }

    if (bestGuess) {
      this.currentGuess = bestGuess.toUpperCase();
    }

    console.log('guess: ', bestGuess)
    console.log('rms: ', bestGuessRms)

    this.thinking=false;
  }

  public stopFn() {
    this.stop = true;
    this.thinking = false;
  }

  public submit() {
    if (this.won || this.stumped || this.thinking) {
      return;
    }

    this.stop = false;

    this.history.push({
      guess: this.currentGuess,
      score: [...this.colorBlocks],
    });

    const thisGuess = this.currentGuess;

    this.currentGuess = '?????';

    const newList: string[] = [];
    this.possibleWords = AppComponent.filterWords(this.possibleWords, thisGuess, this.colorBlocks);

    console.log('Remaining possibilities', this.possibleWords);

    if (this.possibleWords.length < 1) {
      this.stumped = true;
    }
    else if (this.possibleWords.length === 1) {
      this.currentGuess = this.possibleWords[0].toUpperCase();
      this.resetColorBlocks(Colors.Green);
      this.won = true;
    }
    else if (this.possibleWords.length <= 2) {
      this.currentGuess = this.possibleWords[0].toUpperCase();
    }
    else {
      this.makeGuess();
      this.resetColorBlocks();
    }
  }
}
