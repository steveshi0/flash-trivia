import React, {useState, useEffect, useRef} from 'react';
import styled from 'styled-components';
import { useLocation } from "react-router-dom";
import qs from 'qs';
import { searchNameParam, searchRoomParam } from "../Start/HomePage.jsx";
import GameLoading from "./TriviaGame/GameLoading.jsx";
import Question from './TriviaGame/Question.jsx';
import Answer from './TriviaGame/Answer.jsx';
import {createSearchParams, useNavigate} from "react-router-dom";
import {resultUrl} from "../../App.js";
import socket from "./TriviaMultiplayer/socket.js";

// Properties of each question from OpenTrivia API
const tResponse = 'response_code';  // Response of API request
const tType = 'type';
const tQuestion = 'question';
const tCorrect = 'correct_answer';
const tIncorrect = 'incorrect_answers';

// Styled Components
export const TriviaGameContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 60%;
  height: 99%;
  padding: 0 0 5% 0;
`

export const searchScoreParam = 'score';

// Question Queue to track the question when the user starts playing the game.
const TriviaGame = (props) => {

  // navigation function use to navigate through pages
  const navigate = useNavigate();

  // States of the TriviaGame Function
  const [loading, setLoading] = useState(true);
  const [userDifficulty, setUserDifficulty] = useState(props.userDifficulty);
  const [triviaRound, setTriviaRound] = useState(0);
  const [triviaQueue, setTriviaQueue] = useState([]);
  const [questionNum, setQuestionNum] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const runTimer = useRef(0);
  const playerLocation = useLocation();

  // Async function to return an array of 50 trivia question from OpenTrivia API, a new batch of question every call
  const getTriviaQuestion = async() => {
    const qCount = 50;
    const url = `https://opentdb.com/api.php?amount=${qCount}&difficulty=${userDifficulty}&type=multiple`
    const openTrivia_call = await fetch(url);
    const openTrivia_data = await openTrivia_call.json();

    // When the api_call failed to send any question send an error
    if (openTrivia_data[tResponse] !== 0) {
      alert("Oops 401 Error occurred, please try again later.");
    }

    const playerInput = qs.parse(playerLocation.search.slice(1)); // playerLocation.search: ?name=steve&room=1234
    const room = playerInput[searchRoomParam];

    const triviaInfo = {
      room: room,
      questions: openTrivia_data.results
    }
    socket.emit('existing-questions', triviaInfo);
    let proposedQuestions = openTrivia_data.results;
    socket.on('existing-questions', triviaInfo => {
      setTriviaQueue(triviaInfo[0]);
    });

    await setTriviaQueue(proposedQuestions);

    // Load up the rendering of the question after triviaQueues finish up fetching the question
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }

  // New round of trivia game, only started on the first round or every new round
  useEffect(() => {
    setUserDifficulty(props.userDifficulty);
    getTriviaQuestion();
    setQuestionNum(0);
    setUserPoints(0);
    runTimer.current = 0;
  }, [triviaRound]);

  // Add up points for the user, and move on to the next question, go to results when finished
  const handlePoints = (e) => {
    if (e === 1) {
      setUserPoints(userPoints + 2);
    }
    // Consider whether to move on to the next question or that finish up the game when it reaches the maximum
    if (questionNum < triviaQueue.length - 1) {
      setQuestionNum(questionNum + 1);
    } else {
      finishCurrentRound();
    }
  }

  // Finish the current round and move on to the result page
  // where the user can view their current score as well as
  // look at the answers to the questions
  const finishCurrentRound = () => {
    setTriviaRound(triviaRound + 1);

    // Send the player to the result page with search param of ?room=1234&score=4325
    const playerInput = qs.parse(playerLocation.search.slice(1)); // playerLocation.search: ?name=steve&room=1234
    const room = playerInput[searchRoomParam];
    navigate({
      pathname: resultUrl,
      search: createSearchParams([
        [searchRoomParam, room],
        [searchScoreParam, userPoints]
      ]).toString()
    });
  }

  // Render Trivia Game (Left Section of Main), show loading screen if questions is still processing
  return(
    <TriviaGameContainer>
      {!loading ? (
        <div>
          <Question qNum={questionNum}
                    qType={triviaQueue[questionNum][tType]}
                    qQues={triviaQueue[questionNum][tQuestion]}
                    qResults={(e) => handlePoints(e)}
                    qRunTimer={runTimer}
          />
          <Answer qCorrect={triviaQueue[questionNum][tCorrect]}
                  qIncorrect={triviaQueue[questionNum][tIncorrect]}
                  qResult={(e) => handlePoints(e)}
          />
        </div>
      ) : (
        <GameLoading />
      )}
    </TriviaGameContainer>
  )
}
export default TriviaGame;