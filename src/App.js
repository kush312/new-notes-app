import React, { useState, useEffect } from "react";
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import axios from "axios";
import AWS from "aws-sdk";

const apiURL = "https://0jfr46blp2.execute-api.us-east-1.amazonaws.com/";
const clientId = "27ec53o7gufj5tbprlfao4abjg";

AWS.config.update({
  region: "us-east-1",
  accessKeyId: "ASIAWP3I4IABAMBC5K2D",
  secretAccessKey: "1ipcIrl66bXEgFeZEhJjgsdIONWQlVy2JkNTPCkY",
});

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: "us-east-1",
});

const NoteCard = ({ note, handleDelete, updateNoteLocally }) => {
  const [editMode, setEditMode] = useState(false);
  const [editNote, setEditNote] = useState({ ...note });

  const handleSaveUpdate = async () => {
    try {
      await axios.put(
        `${apiURL}/updateNote?note_id=${note.note_id}&subject=${editNote.subject}&contents=${editNote.contents}`,
        {
          subject: editNote.subject,
          contents: editNote.contents,
        }
      );
      setEditMode(false);
      // Update the local state with the updated note data
      updateNoteLocally(note.note_id, editNote);
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  return (
    <Card elevation={3}>
      <CardContent>
        {!editMode ? (
          <>
            <Typography variant="h6">{note.subject}</Typography>
            <Typography>{note.contents}</Typography>
          </>
        ) : (
          <>
            <TextField
              label="Subject"
              variant="outlined"
              value={editNote.subject}
              onChange={(e) =>
                setEditNote({ ...editNote, subject: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Content"
              variant="outlined"
              value={editNote.contents}
              onChange={(e) =>
                setEditNote({ ...editNote, contents: e.target.value })
              }
              multiline
              rows={3}
              fullWidth
              sx={{ mt: 2 }}
            />
          </>
        )}
      </CardContent>
      <CardActions>
        {!editMode ? (
          <>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setEditMode(true)}
            >
              Edit
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleDelete(note.note_id)}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveUpdate}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setEditMode(false)}
            >
              Cancel
            </Button>
          </>
        )}
      </CardActions>
    </Card>
  );
};

function App() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState({ subject: "", contents: "" });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const getAuthToken = () => {
    return localStorage.getItem("authToken");
  };

  const fetchNotes = async () => {
    try {
      const token = getAuthToken(); // Replace this with a function that retrieves the authentication token from your app's state or local storage
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const response = await axios.get(`${apiURL}/getAllNotes`, { headers });
      setNotes(response.data);
    } catch (error) {
      console.error("Error fetching notes:", error);
      // Handle error (e.g., show an error message)
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [isLoggedIn]);

  const handleLogin = async () => {
    try {
      const params = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      };

      const data = await cognito.initiateAuth(params).promise();

      // Check if the challenge name is "NEW_PASSWORD_REQUIRED"
      if (data.ChallengeName === "NEW_PASSWORD_REQUIRED") {
        console.log("New password is required.");

        // You need to prompt the user to enter a new password here. For example:
        const newPassword = prompt("Please enter a new password:");
        if (!newPassword) {
          console.error("New password is required.");
          // Handle the case where the user cancels or does not provide a new password.
          return;
        }

        // Respond to the challenge with the new password using RespondToAuthChallenge API
        const respondParams = {
          ChallengeName: data.ChallengeName,
          ClientId: clientId,
          ChallengeResponses: {
            USERNAME: username,
            NEW_PASSWORD: newPassword,
          },
          Session: data.Session,
        };

        const respondData = await cognito
          .respondToAuthChallenge(respondParams)
          .promise();

        // Check if the authentication is successful after responding to the challenge.
        if (
          respondData &&
          respondData.AuthenticationResult &&
          respondData.AuthenticationResult.IdToken
        ) {
          console.log(
            "Authentication successful:",
            respondData.AuthenticationResult
          );
          // Save the token to local storage after successful login
          localStorage.setItem(
            "authToken",
            respondData.AuthenticationResult.IdToken
          );
          setIsLoggedIn(true);
          setUsername("");
          setPassword("");
        } else {
          console.error("Authentication failed: Invalid data structure");
          // Handle login error (e.g., show an error message)
        }
      } else if (
        data &&
        data.AuthenticationResult &&
        data.AuthenticationResult.IdToken
      ) {
        console.log("Authentication successful:", data.AuthenticationResult);
        // Save the token to local storage after successful login
        localStorage.setItem("authToken", data.AuthenticationResult.IdToken);
        setIsLoggedIn(true);
        setUsername("");
        setPassword("");
      } else {
        console.error("Authentication failed: Invalid data structure");
        // Handle login error (e.g., show an error message)
      }
    } catch (error) {
      console.error("Error signing in:", error);
      // Handle login error (e.g., show an error message)
    }
  };

  const handleSignUp = async () => {
    try {
      const params = {
        ClientId: clientId,
        Username: username,
        Password: password,
        UserAttributes: [
          {
            Name: "email",
            Value: email,
          },
        ],
      };

      const data = await cognito.signUp(params).promise();
      console.log("User signed up successfully:", data.UserSub);
      // Handle successful registration (e.g., show a success message)
    } catch (error) {
      console.error("Error signing up:", error);
      // Handle registration error (e.g., show an error message)
    }
  };

  const handleCreateNote = async () => {
    try {
      await axios.post(`${apiURL}/createNote`, {
        subject: newNote.subject,
        contents: newNote.contents,
      });

      setNewNote({ subject: "", contents: "" });
      fetchNotes();
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleDeleteNote = async (note_id) => {
    try {
      await axios.delete(`${apiURL}/deleteNote?note_id=${note_id}`);
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setIsLoggedIn(false);
  };

  const theme = createTheme({
    palette: {
      primary: {
        main: "#1976d2",
      },
      error: {
        main: "#f44336",
      },
    },
    typography: {
      fontFamily: "Arial, sans-serif",
    },
  });

  const updateNoteLocally = (note_id, updatedNote) => {
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.note_id === note_id ? { ...note, ...updatedNote } : note
      )
    );
  };

  const toggleRegister = () => {
    setIsRegistering((prev) => !prev);
  };

  return (
    <ThemeProvider theme={theme}>
      <Container>
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Notes App
            </Typography>
            {isLoggedIn && (
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            )}
          </Toolbar>
        </AppBar>
        {isLoggedIn ? (
          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 2 }}>
                <TextField
                  label="Subject"
                  variant="outlined"
                  value={newNote.subject}
                  onChange={(e) =>
                    setNewNote({ ...newNote, subject: e.target.value })
                  }
                  fullWidth
                />
                <TextField
                  label="Content"
                  variant="outlined"
                  value={newNote.contents}
                  onChange={(e) =>
                    setNewNote({ ...newNote, contents: e.target.value })
                  }
                  multiline
                  rows={3}
                  fullWidth
                  sx={{ mt: 2 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={handleCreateNote}
                >
                  Create Note
                </Button>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h5">Notes</Typography>
            </Grid>
            {notes.map((note) => (
              <Grid item xs={12} key={note.note_id}>
                <NoteCard
                  note={note}
                  handleDelete={handleDeleteNote}
                  updateNoteLocally={updateNoteLocally}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 2 }}>
                {!isRegistering ? (
                  <>
                    <TextField
                      label="Username"
                      variant="outlined"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Password"
                      variant="outlined"
                      value={password}
                      type="password"
                      onChange={(e) => setPassword(e.target.value)}
                      fullWidth
                      sx={{ mt: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      sx={{ mt: 2 }}
                      onClick={handleLogin}
                    >
                      Login
                    </Button>
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={toggleRegister}
                      sx={{ mt: 2 }}
                    >
                      Register
                    </Button>
                  </>
                ) : (
                  <>
                    <TextField
                      label="Username"
                      variant="outlined"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Password"
                      variant="outlined"
                      value={password}
                      type="password"
                      onChange={(e) => setPassword(e.target.value)}
                      fullWidth
                      sx={{ mt: 2 }}
                    />
                    <TextField
                      label="Email"
                      variant="outlined"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                      sx={{ mt: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      sx={{ mt: 2 }}
                      onClick={handleSignUp}
                    >
                      Sign Up
                    </Button>
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={toggleRegister}
                      sx={{ mt: 2 }}
                    >
                      Back to Login
                    </Button>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
