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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  // This was chosen based on external analysis showing it minimized the size of
  // the remaining possible answers
  static readonly firstGuess = 'raise';

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
        }
      }
    }

    return blocks;
  }

  public reset() {
    this.stumped = false;
    this.possibleWords = [...words];
    this.currentGuess = AppComponent.firstGuess.toUpperCase();
    this.colorBlocks = [
      Colors.Grey,
      Colors.Grey,
      Colors.Grey,
      Colors.Grey,
      Colors.Grey,
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
      const wordScore = this.score(word, guess);

      if (this.compareScores(score, wordScore)) {
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

    // Check all words, not just current possible words
    for (let guess of words) {
      if (this.stop) {
        return;
      }
    // TODO check more words
    // for (let guess of ['prong']) {
      count++;

      // Add a delay so we don't kill the event loop and freeze the whole page
      if (count % 100 === 0) {
        this.progress = Math.floor(100 * count/words.length);
        await new Promise(res => setTimeout(res, 10));
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

    this.thinking=false;
  }

  public stopFn() {
    this.stop = true;
    this.thinking = false;
  }

  public submit() {
    const newList: string[] = [];
    this.possibleWords = AppComponent.filterWords(this.possibleWords, this.currentGuess, this.colorBlocks);

    console.log(this.possibleWords);

    if (this.possibleWords.length < 1) {
      this.stumped = true;
    }
    else if (this.possibleWords.length <= 2) {
      this.currentGuess = this.possibleWords[0].toUpperCase();
    }
    else {
      this.makeGuess();
    }
  }
}
