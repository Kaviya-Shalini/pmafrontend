import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timer } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

interface FamilyMember {
  id: string;
  username: string;
  unread?: number;
}

interface ChatMessage {
  sender: string;
  message: string;
  createdAt: Date;
}

interface User {
  userId: string;
  username: string;
  isAlzheimer: boolean;
}

@Component({
  selector: 'app-connect-family',
  templateUrl: './connectfamily.html',
  styleUrls: ['./connectfamily.css'],
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  standalone: true,
})
export class ConnectFamilyComponent implements OnInit {
  showChatPanel = false;
  searchTerm = '';
  memories: any[] = [];
  user: User | null = null;
  form: FormGroup;
  familyMembers: FamilyMember[] = [];
  chats: { [key: string]: ChatMessage[] } = {};
  selectedMember: FamilyMember | null = null;
  newMessage = '';
  showChatModal = false;
  toastVisible = false;
  toastMessage = '';
  selectedMemory: any = null;
  showConfirmDialog: boolean = false;
  confirmedMemoryId: string = '';

  page: number = 0;
  size: number = 8;
  totalPages: number = 1;

  constructor(private fb: FormBuilder, private http: HttpClient, private toastr: ToastrService) {
    this.form = this.fb.group({ username: [''] });
  }

  ngOnInit(): void {
    this.fetchCurrentUser();
    this.pollMessages();
  }

  // in src/app/connectfamily/connectfamily.ts

  fetchCurrentUser() {
    const userId = localStorage.getItem('pma-userId');
    if (!userId) {
      console.error('User ID not found, cannot fetch user data.');
      return;
    }
    this.http.get<User>(`http://localhost:8080/api/user/${userId}`).subscribe((res) => {
      this.user = res;
      this.fetchFamilyMembers();
      this.loadMemories(); // This will now work correctly
    });
  }

  // in src/app/connectfamily/connectfamily.ts

  loadMemories() {
    if (!this.user) return;
    this.http
      .get<any>(
        `http://localhost:8080/api/memories/user/${this.user.userId}?page=${this.page}&size=${this.size}&search=${this.searchTerm}`
      )
      .subscribe((res: any) => {
        this.memories = res.content || []; // <-- Correctly assign the content array
        this.totalPages = res.totalPages || 1;
      });
  }

  filteredMemories() {
    if (!this.searchTerm) return this.memories;
    return this.memories.filter(
      (m) =>
        m.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (m.customCategory && m.customCategory.toLowerCase().includes(this.searchTerm.toLowerCase()))
    );
  }

  toggleChatPanel() {
    this.showChatPanel = !this.showChatPanel;
  }

  addFamilyMember() {
    const username = this.form.value.username;
    if (!username) return;
    this.http.post('http://localhost:8080/api/family/connect', { username }).subscribe(() => {
      this.toast('Family member connected!');
      this.form.reset();
      this.fetchFamilyMembers();
      this.loadMemories(); // Load memories after connection
    });
  }

  fetchFamilyMembers() {
    this.http.get<FamilyMember[]>('http://localhost:8080/api/family/list').subscribe((res) => {
      this.familyMembers = res.map((member) => ({ ...member, unread: 0 }));
      res.forEach((m) => (this.chats[m.username] = []));
    });
  }

  disconnectFamilyMember(member: FamilyMember) {
    if (!confirm(`Are you sure you want to disconnect ${member.username}?`)) return;
    this.http
      .post('http://localhost:8080/api/family/disconnect', { username: member.username })
      .subscribe(() => {
        this.toast(`${member.username} disconnected.`);
        this.fetchFamilyMembers();
        delete this.chats[member.username];
        if (this.selectedMember?.username === member.username) this.closeChat();
      });
  }

  openChat(member: FamilyMember) {
    this.selectedMember = member;
    this.showChatModal = true;
    member.unread = 0;

    // Fetch the full conversation history when a chat is opened
    this.http
      .get<ChatMessage[]>(`http://localhost:8080/api/chat/conversation?other=${member.username}`)
      .subscribe((res) => {
        this.chats[member.username] = res;
      });
  }

  sendMessage() {
    if (!this.selectedMember || !this.newMessage.trim() || !this.user) return;
    const message = this.newMessage.trim();
    const to = this.selectedMember.username;

    this.http.post('http://localhost:8080/api/chat/send', { to, message }).subscribe(() => {
      // Add the message to the chat window immediately
      if (!this.chats[to]) {
        this.chats[to] = [];
      }
      this.chats[to].push({
        sender: this.user?.username!,
        message,
        createdAt: new Date(),
      });
      this.newMessage = '';
    });
  }

  pollMessages() {
    timer(0, 5000).subscribe(() => {
      this.http.get<ChatMessage[]>('http://localhost:8080/api/chat/receive').subscribe((res) => {
        res.forEach((msg) => {
          if (!this.chats[msg.sender]) this.chats[msg.sender] = [];
          // Use a more reliable check to see if the message already exists
          const exists = this.chats[msg.sender].some(
            (m) =>
              m.message === msg.message &&
              new Date(m.createdAt).getTime() === new Date(msg.createdAt).getTime()
          );
          if (!exists) {
            this.chats[msg.sender].push(msg);
            const member = this.familyMembers.find((m) => m.username === msg.sender);
            if (
              member &&
              (!this.selectedMember || this.selectedMember.username !== member.username)
            ) {
              member.unread = (member.unread || 0) + 1;
              this.toast(`New message from ${member.username}`);
            }
          }
        });
      });
    });
  }

  closeChat() {
    this.showChatModal = false;
    this.selectedMember = null;
  }

  deleteMessage(member: FamilyMember, message: ChatMessage) {
    if (!confirm('Delete this message?')) return;
    this.http
      .post('http://localhost:8080/api/chat/delete', { username: member.username, message })
      .subscribe(() => {
        this.chats[member.username] = this.chats[member.username].filter((m) => m !== message);
        this.toast('Message deleted.');
      });
  }

  clearAllChats(member: FamilyMember) {
    if (!confirm(`Clear all chats with ${member.username}?`)) return;
    this.http
      .post('http://localhost:8080/api/chat/clear', { username: member.username })
      .subscribe(() => {
        this.chats[member.username] = [];
        this.toast('All chats cleared.');
      });
  }

  // ------------------- Memory Functions -------------------
  openMemory(memory: any) {
    this.selectedMemory = memory;
  }

  closeModal() {
    this.selectedMemory = null;
  }

  downloadFile(memoryId: string) {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=file`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'memory-file';
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  downloadVoice(memoryId: string) {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=voice`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch((err) => console.error('Audio play error:', err));
      });
  }

  confirmDelete(memoryId: string) {
    this.confirmedMemoryId = memoryId;
    this.showConfirmDialog = true;
    this.selectedMemory = null;
  }

  cancelDelete() {
    this.showConfirmDialog = false;
    this.confirmedMemoryId = '';
  }

  deleteMemory(memoryId: string) {
    this.http
      .delete<{ success: boolean; message: string }>(
        `http://localhost:8080/api/memories/${memoryId}`
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.memories = this.memories.filter((m) => m.id !== memoryId);
            if (this.selectedMemory?.id === memoryId) this.selectedMemory = null;
            this.toastr.success(res.message, 'Deleted');
          } else {
            this.toastr.error(res.message, 'Error');
          }
          this.cancelDelete();
        },
        error: () => {
          this.toastr.error('Failed to delete memory', 'Error');
          this.cancelDelete();
        },
      });
  }

  toast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 3000);
  }
  // in src/app/connectfamily/connectfamily.ts

  nextPage() {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadMemories();
    }
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      this.loadMemories();
    }
  }
}
