import React, {useState, useEffect} from 'react';
import styled from 'styled-components';
import { useLocation } from "react-router-dom";
import qs from 'qs';
import { searchNameParam, searchRoomParam } from "../../Start/HomePage.jsx";
import { v4 as uuidv4 } from 'uuid';
import Peer from 'peerjs';
import socketIOClient from 'socket.io-client';
export const socket = socketIOClient("http://localhost:3002", {secure: false});

// ----styled components----
/** CHAT */
const ChatRootContainer = styled.div` // Root of the Chat rendering where clients send msg to communicate with others
  background-color: black;
  color: black;
  font-size: 1em;
  font-family: Arial,serif;
  display: flex;
  flex-direction: column;
  border-radius: .25em;
`
const ChatHistoryContainer = styled.div` // History of past chat
  width: 40.33vw;
  height: 28.5vh;
  margin-right: auto;
  padding: 3px 0 0 3px;
  overflow-x: hidden;
  overflow-y: auto;
`
// Individual Message from each player
const IndividualChat = styled.p` // Individual chat style components
  display: flex;
  width: 40.33vw;
  margin: .75vh 0 5px .5vw;
  color: white;
`
const IndividualChatFirstName = styled.span`
  font-weight: bold;
  display: flex;
  width: 2.5vw;
  margin-right: 1.5vw;
  text-align: left;
`
const IndividualChatMsg = styled.span`
  text-align: left;
  margin-right: 2vw;
  word-spacing: 0.75px;
`
// Box to insert new message to the group
const InsertChatContainer = styled.div` // Container where user can send a message and post it inside ChatHistory
  display: flex;
  justify-content: center;
  align-items: center;
`
const InsertChatInput = styled.input` // Text-input to type up chat
  background-color: white;
  width: 38.25vw;
  height: 4vh;
  font-size: 1.5em;
  margin: 0;
`
const InsertChatBtn = styled.button` // Send a event to add chat to ChatHistoryContainer
  cursor: pointer;
  width: 2vw;
  height: 4.35vh;
  background-color: deepskyblue;
  border: none;
  margin: 0;
  :hover {
    font-weight: bold;
  }
  :active {
    background-color: limegreen;
  }
`

/** VIDEO */
const VideoRootContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0;
`
const VideoHolder1 = styled.div`
  width: 20vw;
  height: 25vh;
  display: flex;
  margin-top: 10px;
  background-color: deeppink;
  text-align: center;
  justify-content: center;
  align-items: center;
`
const VideoHolder2 = styled(VideoHolder1)`
  margin-left: 5px;
`
const VideoHolder3 = styled(VideoHolder1)`
  margin-bottom: 10px;
  margin-right: 5px;
`
const VideoHolder4 = styled(VideoHolder1)`
  margin-bottom: 10px;
  margin-left: 5px;
`

// MultiCommunication part of the Main where player can communicate with four other player via video/chat
const MultiCommunication = (props) => {

  // unique uuid for each player, use for keeping track of users in socket for chat and peer identification for video
  const [userId, setUserId] = useState(`${uuidv4()}`);

  // const representing value of the three properties that will be emitted to the socket server
  const [userName, setUserName] = useState('');
  const [userRoom, setUserRoom] = useState('');
  const [userMsg, setUserMsg] = useState('');

  // chatHistory: container for chat history among 5 players
  // each index stores an object with just userName + userMsg prop
  const [chatHistory, setChatHistory] = useState([]);

  // Update the chatHistory by setting the new state as the copy of the history with incomingMsg appended to it
  const updateChatHistory = (incomingMsg) => {
    const chatHistoryCopy = chatHistory;
    chatHistoryCopy.push(incomingMsg);
    setChatHistory([...chatHistoryCopy]);
  }

  // () Obtain the player information from the url such as: http://localhost:3000/game/?name=steve&room=1234
  // Effect() After a player joined, get their information and inform other players in the chat room
  const playerLocation = useLocation();
  useEffect(() => {
    const playerInput = qs.parse(playerLocation.search.slice(1)); // playerLocation.search: ?name=steve&room=1234
    setUserName(playerInput[searchNameParam]);
    setUserRoom(playerInput[searchRoomParam]);

    // emit an 'join-game' event that will place the player in their room with their team
    socket.emit("join-game", {
      userId: userId,
      userName: playerInput[searchNameParam],
      userRoom: playerInput[searchRoomParam],
      userMsg: `I have joined the game ヾ(・ﻌ・)ゞ at 
        ${new Date().getHours()}:${new Date().getMinutes() < 10 ?
        '0' + new Date().getMinutes()
        : new Date().getMinutes()}
        `
    });
    // Listen for 'new-player' event signifying a new player joining their game and send an update to chatHistory
    socket.on("new-player", (newPlayerData) => {
      updateChatHistory(newPlayerData);
    });
  }, [playerLocation]);

  // () post the new chat into the chatHistory and emitting to all players within the room
  const postNewChat = () => {
      const postedChat = {
      userId: userId,
      userName: userName,
      userMsg: "(◔_◔)"
    };
    if (userMsg.length !== 0) {
      postedChat['userMsg'] = userMsg;
    }
    socket.emit("chat-message", postedChat);
    setUserMsg('');

    // Listen for any incoming messages from other players
    socket.on("chat-message", (incomingChat) => {
      console.log(`I have received an chat event from the server at ${new Date().getMilliseconds()}-->${incomingChat.userMsg}`);
      //const newIndividualChat = { userName: incomingChat['userName'], userMsg: incomingChat['userMsg'] }
      updateChatHistory(incomingChat);
    });

    // Listen for any player leaving the game and then updating the rest of the players in the game room
    socket.on("lost-player", (incomingUpdate) => {
      console.log(incomingUpdate);
      updateChatHistory(incomingUpdate);
    })
  }

  // Establish peer connection between 4 other players
  const [userPeer, setUserPeer] = useState(new Peer(userId));
  const [userCallList, setUserCallList] = useState([]);
  useEffect(() => {
    socket.emit("join-peers", {
      "userId": userId,
      "userName": userName,
    });
    socket.on("join-peers", (newPeerInfo) => {
      console.log("Attempting to establish connection with new peer..");
      const newCall = userPeer.call(`${newPeerInfo.userId}`, navigator.getUserMedia());
      const userCallListCopy = userCallList;
      userCallListCopy.push(newCall);
      setUserCallList(userCallListCopy);
    });
    userPeer.on('call', function(call){
      call.answer(navigator.getUserMedia);
    })
  }, []);

  // Render the lower right chat function on main page
  return(
    <div>
      <VideoRootContainer>
        <VideoHolder1>Player Video 1</VideoHolder1>
        <VideoHolder2>Player Video 2</VideoHolder2>
        <VideoHolder3>Player Video 3</VideoHolder3>
        <VideoHolder4>Player Video 4</VideoHolder4>
      </VideoRootContainer>
      <ChatRootContainer>
        <ChatHistoryContainer>
          {chatHistory.map((curr, ind) => {
            return <IndividualChat key={ind}>
              <IndividualChatFirstName>{curr['userName']}:</IndividualChatFirstName>
              <IndividualChatMsg>{curr['userMsg']}</IndividualChatMsg>
            </IndividualChat>
          })}
        </ChatHistoryContainer>
        <InsertChatContainer>
          <InsertChatInput type={"text"} onChange={(e) => setUserMsg(e.target.value)} value={userMsg}/>
          <InsertChatBtn onClick={postNewChat}>post</InsertChatBtn>
        </InsertChatContainer>
      </ChatRootContainer>
    </div>
  )
}

export default MultiCommunication;