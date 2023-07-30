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
import { withAuthenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { Auth } from "aws-amplify";
import axios from "axios";

// Include the Amplify configuration directly here
Amplify.configure({
  aws_cognito_region: "us-east-1",
  aws_user_pools_id: "us-east-1_S0r18LnXP",
  aws_user_pools_web_client_id: "4fkmu0f69t4jqtlosejd90laho",
});

const apiURL = "https://0jfr46blp2.execute-api.us-east-1.amazonaws.com/";

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

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${apiURL}/getAllNotes`);
      setNotes(response.data);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  // Fetch all notes on component mount
  useEffect(() => {
    fetchNotes();
  }, []);

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

  // Function to update the notes locally after API update
  const updateNoteLocally = (note_id, updatedNote) => {
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.note_id === note_id ? { ...note, ...updatedNote } : note
      )
    );
  };

  // Add authentication status to the UI
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await Auth.currentAuthenticatedUser();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      }
    };

    checkUser();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Container>
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Notes App
            </Typography>
            {user ? (
              <Button color="inherit" onClick={() => Auth.signOut()}>
                Logout
              </Button>
            ) : (
              <Button color="inherit" onClick={() => Auth.federatedSignIn()}>
                Login
              </Button>
            )}
          </Toolbar>
        </AppBar>
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
      </Container>
    </ThemeProvider>
  );
}

export default withAuthenticator(App);
