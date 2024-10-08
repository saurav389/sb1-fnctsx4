import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface Task {
  id: string;
  taskName: string;
  description: string;
  status: 'attended' | 'pending' | 'in-progress' | 'completed';
  assignedTo: string;
  projectId: string;
  rate: number;
  parentTaskId?: string;
}

interface TaskSummary {
  totalAttended: number;
  totalPending: number;
  totalInProgress: number;
  totalCompleted: number;
  totalEarned: number;
  totalMoneyReceived: number;
  totalBalanceAmount: number;
}

const TeamMemberDashboard: React.FC = () => {
  const [user] = useAuthState(auth);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskSummary, setTaskSummary] = useState<TaskSummary>({
    totalAttended: 0,
    totalPending: 0,
    totalInProgress: 0,
    totalCompleted: 0,
    totalEarned: 0,
    totalMoneyReceived: 0,
    totalBalanceAmount: 0,
  });

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    const teamMemberQuery = query(collection(db, 'teamMembers'), where('userId', '==', user.uid));
    const teamMemberSnapshot = await getDocs(teamMemberQuery);
    
    if (teamMemberSnapshot.empty) {
      console.error('Team member not found');
      return;
    }

    const teamMemberId = teamMemberSnapshot.docs[0].id;
    const tasksQuery = query(collection(db, 'tasks'), where('assignedTo', '==', teamMemberId));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    const taskList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    setTasks(taskList);
    calculateTaskSummary(taskList, teamMemberSnapshot.docs[0].data().moneyReceived || 0);
  };

  const calculateTaskSummary = (tasks: Task[], moneyReceived: number) => {
    const summary: TaskSummary = {
      totalAttended: tasks.filter(t => t.status === 'attended').length,
      totalPending: tasks.filter(t => t.status === 'pending').length,
      totalInProgress: tasks.filter(t => t.status === 'in-progress').length,
      totalCompleted: tasks.filter(t => t.status === 'completed').length,
      totalEarned: tasks.reduce((sum, task) => task.status === 'completed' ? sum + task.rate : sum, 0),
      totalMoneyReceived: moneyReceived,
      totalBalanceAmount: 0,
    };
    summary.totalBalanceAmount = summary.totalEarned - summary.totalMoneyReceived;
    setTaskSummary(summary);
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
    fetchTasks(); // Refresh tasks after update
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Team Member Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800">Total Attended</h4>
          <p className="text-2xl font-bold text-blue-600">{taskSummary.totalAttended}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-800">Total Pending</h4>
          <p className="text-2xl font-bold text-yellow-600">{taskSummary.totalPending}</p>
        </div>
        <div className="bg-orange-100 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-orange-800">Total In Progress</h4>
          <p className="text-2xl font-bold text-orange-600">{taskSummary.totalInProgress}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-green-800">Total Completed</h4>
          <p className="text-2xl font-bold text-green-600">{taskSummary.totalCompleted}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-purple-800">Total Earned</h4>
          <p className="text-2xl font-bold text-purple-600">${taskSummary.totalEarned}</p>
        </div>
        <div className="bg-indigo-100 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-indigo-800">Total Money Received</h4>
          <p className="text-2xl font-bold text-indigo-600">${taskSummary.totalMoneyReceived}</p>
        </div>
        <div className="bg-pink-100 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-pink-800">Total Balance Amount</h4>
          <p className="text-2xl font-bold text-pink-600">${taskSummary.totalBalanceAmount}</p>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-xl font-bold mb-4">Your Tasks</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Task Name</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rate</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{task.taskName}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{task.description}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                      task.status === 'attended' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">${task.rate}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                      className="block w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="attended">Attended</option>
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberDashboard;