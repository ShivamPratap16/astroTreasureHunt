import Team from "../Model/Team.js";
import User from "../Model/User.js"
import  { updateTeamScore } from './Game.controller.js'

const maxNumberOfTeamMembers = 3;


//Create Team
const createTeam = async (req, res) => {
    try{
        const { teamName } = req.body;
        console.log("BODY: ", req.body);
        console.log("USER: ", req.user);

        const tempUser = await User.findById(req.user._id);

        if(tempUser.team != null){
            return res.status(400).json({message: "You are already in a team"});
        }
        const teamCode = Math.random().toString(36).substring(2, 15);

        const team = await Team.create({
            teamName,
            teamLead: req.user._id,
            members: [req.user._id],
            currLevel: null,
            score: 0,
            currentQuestion: null,
            completedQuestions: [],
            status: "active",
            blocked: false,
            team_code: teamCode
        });

        const user = await User.findByIdAndUpdate(req.user._id, {role: "team_leader", team: team._id});

        
        return res.status(200).json({message: "Team created successfully", team});
    }
    catch(error){
        return res.status(500).json({message: "Failed to create team", error: error.message});
    }

}


const getTeamCodeToTeamLeader = async (req, res) => {
    try{
        const user = req.user;
        const team = await Team.findOne({teamLead: user._id});
        if(!team){
            return res.status(400).json({message: "You are not a team leader of any team"});
        }
        return res.status(200).json({message: "Team code", team_code: team.team_code});
    }
    catch(error){
        return res.status(500).json({message: "Failed to get team code to team leader", error: error.message});
    }
}

const joinTeam = async (req, res) => {
    try{
        const {teamCode} = req.body;

        if(!teamCode){
            return res.status(400).json({message: "Team code is required"});
        }

        const team = await Team.findOne({team_code: teamCode});
        if(!team){
            return res.status(400).json({message: "Invalid team code"});
        }

        if(team.members.length >= maxNumberOfTeamMembers){
            return res.status(400).json({message: "Team is full"});
        }

        const user = await User.findById(req.user._id);

        if(user.team != null){
            return res.status(400).json({message: "You are already in a team"});
        }

        await User.findByIdAndUpdate(req.user._id, {team: team._id});
        await Team.findByIdAndUpdate(team._id, {$push: {members: req.user._id}});

        return res.status(200).json({message: "Joined team successfully"});
    }
    catch(error){
        return res.status(500).json({message: "Failed to join team", error: error.message});
    }
        
}


const getCurrentQuestion = async (req, res) => {
    try{
        const user = req.user;
        const team = await Team.findById(user.team);
        if(!team){
            return res.status(400).json({message: "You are not in any team"});
        }

        if(team.currLevel == null){
            return res.status(400).json({message: "Your team has not been alloted a question. The game might not have been started yet by the admin."})
        }

        const currQuestion = await Question.findById(team.currentQuestion).select("-correctCode -createdBy");
        if(!currQuestion){
            return res.status(400).json({message: "The question you requested for does not exist"});
        }

        return res.status(200).json({message: "Current question", currQuestion: currQuestion});
    }
    catch(error){
        return res.status(500).json({message: "Failed to get current question", error: error.message});
    }
}

const submitQuestionCode = async (req, res) => {
    try{
        const { questionCode, questionId } = req.body;
        const user = req.user;

        if(user.role !== "team_leader"){
            return res.status(400).json({message: "Only Team Leaders can submit the questino code"});
        }

        const question = await Question.findById(questionId);
        if(!question){
            return res.status(400).json({message: "Question not found"});
        }

        if(question.answer !== questionCode){
            return res.status(400).json({message: "Incorrect question code"});
        }

        //The team leader has entered the correct code for the question
        //Updating the team's score
        await updateTeamScore(team)

        return res.status(200).json({message: "Question submitted successfully"});
    }
    catch(error){
        return res.status(500).json({message: "Failed to submit question code", error: error.message});
    }
}


const getPlayerLeaderBoard = async (req, res) => {
    try{
        const allTeams = await Team.find({}).select("teamName currLevel score completedQuestions")
        if(allTeams.length === 0){
            return res.status(400).json({message: "No teams have been created in the game yet"});
        }
        const teamsSortedByScore = allTeams.sort((a, b) => a.score - b.score);
        return res.status(200).json({message: "Player Leaderboard", leaderboard: teamsSortedByScore});
    }
    catch(error){
        return res.status(500).json({message: "Error fetching player leaderboard", error: error.message, completeError: error});
    }
}





export {createTeam, getTeamCodeToTeamLeader, joinTeam, getCurrentQuestion, submitQuestionCode, getPlayerLeaderBoard};




