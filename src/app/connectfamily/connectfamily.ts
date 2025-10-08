import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timer } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

// Interfaces remain the same
interface FamilyMember {
  id: string;
  username: string;
  unread?: number;
}

interface ChatMessage {
  fromUser: string; // Match backend model
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
  showConfirmDialog: boolean = false;
  confirmedMemoryId: string = '';
  page: number = 0;
  size: number = 8;
  totalPages: number = 1;

  // Added missing property
  selectedMemory: any = null;

  constructor(private fb: FormBuilder, private http: HttpClient, private toastr: ToastrService) {
    this.form = this.fb.group({ username: [''] });
  }

  ngOnInit(): void {
    this.fetchCurrentUser();
    this.pollMessages();
  }

  fetchCurrentUser() {
    const userId = localStorage.getItem('pma-userId');
    if (!userId) return;
    this.http.get<User>(`http://localhost:8080/api/user/${userId}`).subscribe((res) => {
      this.user = res;
      this.fetchFamilyMembers();
      if (res.isAlzheimer) {
        this.loadMemories(res.userId);
      }
    });
  }

  fetchFamilyMembers() {
    this.http.get<FamilyMember[]>('http://localhost:8080/api/family/list').subscribe((res) => {
      this.familyMembers = res.map((member) => ({ ...member, unread: 0 }));
      res.forEach((m) => {
        if (!this.chats[m.username]) this.chats[m.username] = [];
      });
    });
  }

  selectMember(member: FamilyMember) {
    this.selectedMember = member;
    if (this.user && !this.user.isAlzheimer) {
      this.loadMemories(member.id);
    }
    this.showChatPanel = true;
    this.openChat(member);
  }

  loadMemories(userId: string) {
    this.http
      .get<any>(
        `http://localhost:8080/api/memories/user/${userId}?page=${this.page}&size=${this.size}&search=${this.searchTerm}`
      )
      .subscribe((res: any) => {
        this.memories = res.content || [];
        this.totalPages = res.totalPages || 1;
      });
  }

  filteredMemories() {
    return this.memories;
  }

  addFamilyMember() {
    const username = this.form.value.username;
    if (!username || !this.user?.isAlzheimer) {
      this.toastr.warning('Only patients can add family members.');
      return;
    }
    this.http.post('http://localhost:8080/api/family/connect', { username }).subscribe(() => {
      this.toastr.success('Family member connected!');
      this.form.reset();
      this.fetchFamilyMembers();
    });
  }

  disconnectFamilyMember(member: FamilyMember) {
    if (!confirm(`Are you sure you want to disconnect ${member.username}?`)) return;
    this.http
      .post('http://localhost:8080/api/family/disconnect', { username: member.username })
      .subscribe(() => {
        this.toastr.info(`${member.username} disconnected.`);
        this.fetchFamilyMembers();
        delete this.chats[member.username];
        if (this.selectedMember?.id === member.id) this.selectedMember = null;
      });
  }

  openChat(member: FamilyMember) {
    this.selectedMember = member;
    member.unread = 0;
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

    this.http.post('http://localhost:8080/api/chat/send', { to, message }).subscribe((res: any) => {
      if (!this.chats[to]) this.chats[to] = [];
      this.chats[to].push(res.data);
      this.newMessage = '';
    });
  }

  pollMessages() {
    timer(0, 5000).subscribe(() => {
      if (!this.user) return;
      this.http.get<ChatMessage[]>(`http://localhost:8080/api/chat/receive`).subscribe((res) => {
        res.forEach((msg) => {
          const sender = msg.fromUser;
          if (!this.chats[sender]) this.chats[sender] = [];

          const exists = this.chats[sender].some(
            (m) => new Date(m.createdAt).getTime() === new Date(msg.createdAt).getTime()
          );

          if (!exists) {
            this.chats[sender].push(msg);
            const member = this.familyMembers.find((m) => m.username === sender);
            if (
              member &&
              (!this.selectedMember || this.selectedMember.username !== member.username)
            ) {
              member.unread = (member.unread || 0) + 1;
              this.toastr.info(`New message from ${member.username}`);
            }
          }
        });
      });
    });
  }

  isMyMessage(chat: ChatMessage): boolean {
    return chat.fromUser === this.user?.username;
  }

  // Added missing methods
  toggleChatPanel() {
    this.showChatPanel = !this.showChatPanel;
  }

  deleteMessage(member: FamilyMember, message: ChatMessage) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    this.http
      .post('http://localhost:8080/api/chat/delete', {
        username: member.username,
        message: message.message,
        createdAt: message.createdAt,
      })
      .subscribe(() => {
        this.chats[member.username] = this.chats[member.username].filter((m) => m !== message);
        this.toastr.info('Message deleted.');
      });
  }

  clearAllChats(member: FamilyMember) {
    if (!confirm(`Are you sure you want to clear all chats with ${member.username}?`)) return;
    this.http
      .post('http://localhost:8080/api/chat/clear', { username: member.username })
      .subscribe(() => {
        this.chats[member.username] = [];
        this.toastr.info('Chat history cleared.');
      });
  }

  downloadFile(memoryId: string): void {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=file`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'memory-file'; // You might want to get the real filename
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  downloadVoice(memoryId: string): void {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=voice`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      });
  }

  nextPage() {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      const userIdToLoad =
        (this.user?.isAlzheimer ? this.user.userId : this.selectedMember?.id) || '';
      if (userIdToLoad) this.loadMemories(userIdToLoad);
    }
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      const userIdToLoad =
        (this.user?.isAlzheimer ? this.user.userId : this.selectedMember?.id) || '';
      if (userIdToLoad) this.loadMemories(userIdToLoad);
    }
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
}
