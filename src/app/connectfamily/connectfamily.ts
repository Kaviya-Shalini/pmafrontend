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

  fetchCurrentUser() {
    this.http.get<User>('http://localhost:8080/api/user/current').subscribe((res) => {
      this.user = res;
      this.fetchFamilyMembers();
      this.loadMemories();
    });
  }

  loadMemories() {
    if (!this.user) return;
    this.http
      .get<any[]>(`http://localhost:8080/api/memories/user/${this.user.userId}`)
      .subscribe((res) => {
        this.memories = res;
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
  }

  closeChat() {
    this.showChatModal = false;
    this.selectedMember = null;
  }

  sendMessage() {
    if (!this.selectedMember || !this.newMessage.trim() || !this.user) return;
    const message = this.newMessage.trim();
    this.http
      .post('http://localhost:8080/api/chat/send', { to: this.selectedMember.username, message })
      .subscribe(() => {
        this.chats[this.selectedMember!.username].push({
          sender: this.user?.username!,
          message,
          createdAt: new Date(),
        });
        this.newMessage = '';
      });
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

  pollMessages() {
    timer(0, 5000).subscribe(() => {
      this.http.get<ChatMessage[]>('http://localhost:8080/api/chat/receive').subscribe((res) => {
        res.forEach((msg) => {
          if (!this.chats[msg.sender]) this.chats[msg.sender] = [];
          const exists = this.chats[msg.sender].some(
            (m) => m.createdAt.toString() === msg.createdAt.toString()
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
