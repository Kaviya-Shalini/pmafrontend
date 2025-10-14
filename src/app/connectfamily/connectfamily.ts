import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timer, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

// Interfaces for our data structures
interface FamilyMember {
  id: string;
  username: string;
  unread?: number;
}

interface ChatMessage {
  fromUser: string;
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
export class ConnectFamilyComponent implements OnInit, OnDestroy {
  // Component State
  pollingSub?: Subscription;

  showChatPanel = false;
  memories: any[] = [];
  user: User | null = null;
  form: FormGroup;
  familyMembers: FamilyMember[] = [];
  chats: { [key: string]: ChatMessage[] } = {};
  selectedMember: FamilyMember | null = null;
  newMessage = '';

  // State for confirmation dialogs
  showDeleteConfirmDialog = false;
  memoryToDeleteId = '';
  showDisconnectConfirmDialog = false;
  memberToDisconnect: FamilyMember | null = null;

  page = 0;
  size = 8;
  totalPages = 1;

  constructor(private fb: FormBuilder, private http: HttpClient, private toastr: ToastrService) {
    this.form = this.fb.group({ username: [''] });
  }

  ngOnInit(): void {
    this.fetchCurrentUser();
    if (!this.pollingSub) {
      this.startPollingMessages();
    }
  }

  ngOnDestroy(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  fetchCurrentUser() {
    const userId = localStorage.getItem('pma-userId');
    if (!userId) {
      this.user = null;
      return;
    }
    this.http.get<User>(`http://localhost:8080/api/user/${userId}`).subscribe((res) => {
      this.user = { ...res, userId: res.userId || userId }; // Ensure userId is set
      this.fetchFamilyMembers();
      if (res.isAlzheimer) {
        this.loadMemories(this.user.userId);
      }
    });
  }

  fetchFamilyMembers() {
    if (!this.user) return;
    this.http
      .get<FamilyMember[]>(`http://localhost:8080/api/family/list/${this.user.userId}`)
      .subscribe((res) => {
        this.familyMembers = res.map((member) => ({ ...member, unread: 0 }));
        res.forEach((m) => {
          if (!this.chats[m.username]) this.chats[m.username] = [];
        });
      });
  }

  selectMemberAndOpenChat(member: FamilyMember) {
    this.selectedMember = member;
    if (this.user && !this.user.isAlzheimer) {
      this.loadMemories(member.id);
    }
    this.openChat(member);
  }

  loadMemories(userId: string) {
    this.http
      .get<any>(
        `http://localhost:8080/api/memories/user/${userId}?page=${this.page}&size=${this.size}`
      )
      .subscribe((res: any) => {
        this.memories = res.content || [];
        this.totalPages = res.totalPages || 1;
      });
  }

  connectFamilyMember() {
    const username = this.form.value.username;
    if (!username) {
      this.toastr.warning('Please enter a username.');
      return;
    }
    if (!this.user?.isAlzheimer || !this.user.userId) {
      this.toastr.warning('Only patients can add family members.');
      return;
    }

    const payload = {
      patientId: this.user.userId,
      familyMemberUsername: username,
    };

    this.http.post('http://localhost:8080/api/family/connect', payload).subscribe((res: any) => {
      if (res.success) {
        this.toastr.success(res.message || 'Family member connected!');
        this.form.reset();
        this.fetchFamilyMembers();
      } else {
        this.toastr.error(res.message || 'Could not connect family member.');
      }
    });
  }

  // --- Disconnect Flow ---
  startDisconnect(member: FamilyMember) {
    this.memberToDisconnect = member;
    this.showDisconnectConfirmDialog = true;
  }

  cancelDisconnect() {
    this.showDisconnectConfirmDialog = false;
    this.memberToDisconnect = null;
  }

  confirmDisconnect() {
    if (!this.user?.userId || !this.memberToDisconnect) return;

    const payload = {
      patientId: this.user.userId,
      familyMemberId: this.memberToDisconnect.id,
    };

    this.http.post('http://localhost:8080/api/family/disconnect', payload).subscribe({
      next: () => {
        this.toastr.info(`${this.memberToDisconnect?.username} disconnected.`);
        this.fetchFamilyMembers();
        if (this.selectedMember?.id === this.memberToDisconnect?.id) {
          this.selectedMember = null;
        }
        this.cancelDisconnect();
      },
      error: () => {
        this.toastr.error('Failed to disconnect family member');
        this.cancelDisconnect();
      },
    });
  }

  // --- Chat Methods ---
  toggleChatPanel() {
    this.showChatPanel = !this.showChatPanel;
    if (!this.showChatPanel) {
      this.selectedMember = null;
    }
  }

  openChat(member: FamilyMember) {
    this.selectedMember = member;
    member.unread = 0;
    this.showChatPanel = true;

    if (!this.user) return;
    const headers = { 'X-Username': this.user.username };

    this.http
      .get<ChatMessage[]>(`http://localhost:8080/api/chat/conversation?other=${member.username}`, {
        headers,
      })
      .subscribe((res) => {
        this.chats[member.username] = res;
      });
  }

  sendMessage() {
    if (!this.selectedMember || !this.newMessage.trim() || !this.user) return;
    const to = this.selectedMember.username;
    this.http
      .post('http://localhost:8080/api/chat/send', { to, message: this.newMessage.trim() })
      .subscribe((res: any) => {
        if (!this.chats[to]) this.chats[to] = [];
        this.chats[to].push(res.data);
        this.newMessage = '';
      });
  }

  startPollingMessages() {
    this.pollingSub = timer(0, 5000).subscribe(() => {
      if (!this.user) return;
      const headers = { 'X-Username': this.user.username };
      this.http
        .get<ChatMessage[]>(`http://localhost:8080/api/chat/receive`, { headers })
        .subscribe((res) => {
          res.forEach((msg) => {
            const sender = msg.fromUser;
            const exists = this.chats[sender]?.some(
              (m) => new Date(m.createdAt).getTime() === new Date(msg.createdAt).getTime()
            );
            if (exists) return;

            if (!this.chats[sender]) this.chats[sender] = [];
            this.chats[sender].push(msg);

            const member = this.familyMembers.find((m) => m.username === sender);
            if (member && (!this.selectedMember || this.selectedMember.username !== sender)) {
              member.unread = (member.unread || 0) + 1;
              this.toastr.info(`New message from ${member.username}`);
            }
          });
        });
    });
  }

  isMyMessage(chat: ChatMessage): boolean {
    return chat.fromUser === this.user?.username;
  }

  // --- Memory Interaction ---
  downloadFile(memoryId: string): void {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=file`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = 'memory-file';
        a.click();
        URL.revokeObjectURL(objectUrl);
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

  startDelete(memoryId: string) {
    this.memoryToDeleteId = memoryId;
    this.showDeleteConfirmDialog = true;
  }

  cancelDelete() {
    this.showDeleteConfirmDialog = false;
    this.memoryToDeleteId = '';
  }

  confirmDelete() {
    if (!this.memoryToDeleteId) return;
    this.http
      .delete<{ success: boolean; message: string }>(
        `http://localhost:8080/api/memories/${this.memoryToDeleteId}`
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.memories = this.memories.filter((m) => m.id !== this.memoryToDeleteId);
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

  // --- Pagination ---
  nextPage() {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      const userId = this.user?.isAlzheimer ? this.user.userId : this.selectedMember?.id;
      if (userId) this.loadMemories(userId);
    }
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      const userId = this.user?.isAlzheimer ? this.user.userId : this.selectedMember?.id;
      if (userId) this.loadMemories(userId);
    }
  }
}
